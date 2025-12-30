import re

def is_text_legible(text: str) -> bool:
    alnum = len(re.findall(r"[\w\s]", text, re.UNICODE))
    total = len(text)
    return total > 0 and (alnum / total) > 0.6

def clean_text(text):
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r'(?<!\.)\.(?!\.)|[!?]', lambda m: m.group(0) + '\n', text)
    return text
