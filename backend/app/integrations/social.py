"""SocialPublisher adapter: MockMetaPublisher and a MetaGraphPublisher stub."""


class MockMetaPublisher:
    name = "Mock Meta"

    def publish(self, post_id: str, platform: str, caption: str, hashtags: str) -> dict:
        ext = f"mock_{post_id[-8:]}"
        url = f"https://facebook.com/qswellnessclinic/posts/{ext}" if platform == "facebook" else f"https://instagram.com/p/{ext}"
        return {"ok": True, "externalId": ext, "url": url}


class MetaGraphPublisher:
    """Real Facebook/Instagram publishing (STUB).

    Going live: create a Meta Business app, connect the Page + Instagram Business account, pass App Review
    (pages_manage_posts, instagram_content_publish, ...). Facebook: POST /{PAGE_ID}/feed. Instagram: POST
    /{IG_USER_ID}/media then /media_publish (needs a publicly reachable image URL).
    """

    name = "Meta Graph API (pending app review)"

    def publish(self, *a, **k):
        raise NotImplementedError("MetaGraphPublisher is not implemented yet (pending Meta app review). Set SOCIAL_PROVIDER=mock.")
