"""
SOMS Analytics Service — Flask skeleton (System 0)
Stateless compute service. No database access. Internal network only.
"""
import os
from flask import Flask, request, jsonify
from dotenv import load_dotenv

load_dotenv()

INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")

if not INTERNAL_API_KEY or len(INTERNAL_API_KEY) < 32:
    raise RuntimeError(
        "INTERNAL_API_KEY must be set and at least 32 characters long"
    )


def create_app():
    app = Flask(__name__)

    @app.before_request
    def require_internal_key():
        """
        Reject any request (except GET /health) that does not carry the correct
        X-Internal-Key header. This service must never be reachable from the browser.
        """
        if request.path == "/health" and request.method == "GET":
            return  # health check is public

        key = request.headers.get("X-Internal-Key", "")
        if not key or key != INTERNAL_API_KEY:
            return jsonify({"error": "Unauthorized", "details": "Missing or invalid X-Internal-Key"}), 401

    # ── Health check (no key required)
    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    # Register compute blueprints (added per system)
    # from routes.forecast import forecast_bp
    # app.register_blueprint(forecast_bp, url_prefix="/compute")

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG", "false").lower() == "true")
