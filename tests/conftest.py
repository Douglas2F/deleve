import pytest

from app import create_app


@pytest.fixture()
def app(tmp_path):
    return create_app(
        {
            "TESTING": True,
            "DATABASE": tmp_path / "test.sqlite3",
            "SECRET_KEY": "test",
        }
    )


@pytest.fixture()
def client(app):
    return app.test_client()

