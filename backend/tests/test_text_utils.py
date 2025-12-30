import pytest
from app.utils.text import is_text_legible, clean_text

@pytest.mark.parametrize(
    "input_text,expected",
    [
        ("", False),
        ("!!!???", False),
        ("abc!!!", False),
        ("abcde!!!", True),
        ("abc def 123", True),
        ("123 !!! 456", True),
        ("@#$%^", False),
    ]
)
def test_is_text_legible(input_text, expected):
    assert is_text_legible(input_text) == expected

def test_clean_text():
    text = "Hello  world! This is a test. Do you see? Yes."
    cleaned = clean_text(text)
    expected = "Hello world!\n This is a test.\n Do you see?\n Yes.\n"
    assert cleaned == expected
