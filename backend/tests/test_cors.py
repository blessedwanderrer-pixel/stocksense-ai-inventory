import unittest

from fastapi.testclient import TestClient

from app.main import app


class CorsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    def test_local_frontend_authorization_preflight_is_allowed(self) -> None:
        response = self.client.options(
            "/api/me",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:3000")
        self.assertEqual(response.headers["access-control-allow-credentials"], "true")
        self.assertIn("GET", response.headers["access-control-allow-methods"])
        self.assertIn("Authorization", response.headers["access-control-allow-headers"])

    def test_unconfigured_origin_is_not_allowed(self) -> None:
        response = self.client.options(
            "/api/me",
            headers={
                "Origin": "https://untrusted.example",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertNotIn("access-control-allow-origin", response.headers)
