import unittest

import app


class DashboardTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.ensure_data()
        cls.client = app.app.test_client()

    def login_headers(self, email="varin@freight.id", password="sales123"):
        response = self.client.post("/api/login", json={"email": email, "password": password})
        self.assertEqual(response.status_code, 200)
        return {"Authorization": f"Bearer {response.get_json()['token']}"}

    def test_source_spreadsheet_maps_to_140_shipments(self):
        shipments = app.parse_shipments()
        self.assertEqual(len(shipments), 140)
        self.assertEqual(sum(item["productService"] == "LCL" for item in shipments), 114)
        self.assertEqual(sum(item["productService"] == "FCL" for item in shipments), 26)
        self.assertEqual(round(sum(item["weight"] for item in shipments)), 1986569)

    def test_dashboard_requires_login_and_has_research_structure(self):
        self.assertEqual(self.client.get("/api/dashboard").status_code, 401)
        response = self.client.get("/api/dashboard", headers=self.login_headers())
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertGreaterEqual(payload["summary"]["totalShipments"], 140)
        self.assertEqual(len(payload["delayFactors"]), 9)
        weights = {item["factor"]: item["weight"] for item in payload["ahp"]}
        self.assertEqual(weights["Dokumen Kepabeanan"], 0.247)
        self.assertEqual(weights["Kondisi Cuaca dan Lingkungan"], 0.035)
        self.assertAlmostEqual(sum(weights.values()), 1)
        self.assertEqual(payload["consistencyRatio"], 0.081)
        self.assertIn("shipmentProcesses", payload)
        presentation = self.client.get("/api/dashboard?mode=presentation", headers=self.login_headers()).get_json()
        self.assertTrue(presentation["presentationMode"])
        self.assertTrue(presentation["shipmentProcesses"])

    def test_future_data_entry_endpoints_validate_input(self):
        headers = self.login_headers()
        status = self.client.put("/api/shipments/1/status", headers=headers, json={"status": "Invalid"})
        self.assertEqual(status.status_code, 400)
        ahp = self.client.put("/api/ahp", headers=self.login_headers("budi@freight.id", "manager123"), json={})
        self.assertEqual(ahp.status_code, 400)
        password = self.client.put("/api/account/password", headers=headers, json={"currentPassword": "salah", "newPassword": "passwordbaru"})
        self.assertEqual(password.status_code, 400)
        process = self.client.post("/api/shipments/1/process", headers=headers, json={"status": "DELIVERED", "note": "Tidak berurutan"})
        self.assertEqual(process.status_code, 400)
        recommendation = self.client.put("/api/recommendations/Dokumen%20Kepabeanan", headers=self.login_headers("budi@freight.id", "manager123"), json={"status": "Invalid", "owner": "Operasional"})
        self.assertEqual(recommendation.status_code, 400)
        forbidden_ahp = self.client.put("/api/ahp", headers=headers, json={})
        self.assertEqual(forbidden_ahp.status_code, 403)


if __name__ == "__main__":
    unittest.main()
