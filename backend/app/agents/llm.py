import json
import os
from typing import Callable

from openai import OpenAI

from ..config import GROQ_BASE_URL, MODEL, PROMPTS_DIR, require_api_key
from ..tools import ToolContext, execute_tool, llm_tools

_client: OpenAI | None = None


def client() -> OpenAI:
    global _client
    require_api_key()
    if _client is None:
        _client = OpenAI(api_key=os.getenv("GROQ_API_KEY"), base_url=GROQ_BASE_URL)
    return _client


class SpokenFilter:
    """Streaming filter: drops any [bracketed] stage directions and tidies leading whitespace,
    so only words meant for the caller reach the UI, the voice and the saved transcript."""

    def __init__(self) -> None:
        self.in_bracket = False
        self.started = False
        self.skip_space = False

    def feed(self, delta: str) -> str:
        out = []
        for ch in delta:
            if self.in_bracket:
                if ch == "]":
                    self.in_bracket = False
                    self.skip_space = True
                continue
            if ch == "[":
                self.in_bracket = True
                continue
            if self.skip_space:
                self.skip_space = False
                if ch == " ":
                    continue
            if not self.started:
                if ch.isspace():
                    continue
                self.started = True
            out.append(ch)
        return "".join(out)


def _model_kwargs(max_tokens: int) -> dict:
    """gpt-oss models reason before answering and that hidden reasoning counts toward the output limit,
    so keep reasoning low and leave headroom so replies are never cut off."""
    if MODEL.startswith("openai/gpt-oss"):
        return {"max_completion_tokens": max_tokens + 1500, "reasoning_effort": "low"}
    return {"max_completion_tokens": max_tokens}


def load_prompt(name: str, **vars: str) -> str:
    text = (PROMPTS_DIR / f"{name}.md").read_text(encoding="utf8")
    for k, v in vars.items():
        text = text.replace("{{" + k + "}}", v)
    return text


def run_agent(system: str, messages: list, tool_names: list[str] | None, ctx: ToolContext, max_turns: int = 8, max_tokens: int = 1024,
              on_text: Callable[[str], None] | None = None, on_tool: Callable[[dict], None] | None = None) -> dict:
    """Agent loop: call the model, run any requested tools, feed results back, repeat until it answers."""
    messages = list(messages)
    tools = llm_tools(tool_names) if tool_names else None
    events: list[dict] = []
    final_text = ""
    for turn in range(max_turns):
        kwargs: dict = dict(model=MODEL, **_model_kwargs(max_tokens), temperature=0.3, messages=[{"role": "system", "content": system}, *messages], stream=True)
        if tools:
            kwargs["tools"] = tools
        if turn > 0 and on_text and final_text:
            on_text(" ")
        text_parts: list[str] = []
        spoken = SpokenFilter()
        calls: dict[int, dict] = {}
        for chunk in client().chat.completions.create(**kwargs):
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            if delta.content:
                clean = spoken.feed(delta.content)
                if clean:
                    text_parts.append(clean)
                    if on_text:
                        on_text(clean)
            for tc in delta.tool_calls or []:
                c = calls.setdefault(tc.index, {"id": "", "name": "", "arguments": ""})
                if tc.id:
                    c["id"] = tc.id
                if tc.function and tc.function.name:
                    c["name"] = tc.function.name
                if tc.function and tc.function.arguments:
                    c["arguments"] += tc.function.arguments
        final_text = "".join(text_parts)
        assistant: dict = {"role": "assistant", "content": final_text or None}
        if calls:
            assistant["tool_calls"] = [{"id": c["id"], "type": "function", "function": {"name": c["name"], "arguments": c["arguments"] or "{}"}} for _, c in sorted(calls.items())]
        messages.append(assistant)
        if not calls:
            break
        for _, c in sorted(calls.items()):
            try:
                args = json.loads(c["arguments"] or "{}")
            except json.JSONDecodeError:
                args = {}
            if not isinstance(args, dict):  # some models emit null for no-arg calls
                args = {}
            ev = execute_tool(c["name"], args, ctx)
            events.append(ev)
            if on_tool:
                on_tool(ev)
            messages.append({"role": "tool", "tool_call_id": c["id"], "content": json.dumps(ev["output"], default=str)})
    return {"text": final_text, "messages": messages, "events": events}


def complete(system: str | None, prompt: str, max_tokens: int = 1024, json_mode: bool = False) -> str:
    """Single-shot completion, returns text."""
    msgs = ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": prompt}]
    kwargs: dict = dict(model=MODEL, **_model_kwargs(max_tokens), temperature=0.4, messages=msgs)
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    r = client().chat.completions.create(**kwargs)
    return r.choices[0].message.content or ""
