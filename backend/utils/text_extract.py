from PyPDF2 import PdfReader

def extract_text_from_pdf(file_obj):
    """Extracts raw text from a PDF file-like object."""
    reader = PdfReader(file_obj)
    text = []
    for page in reader.pages:
        if page_text := page.extract_text():
            text.append(page_text)
    return "\n".join(text)

def truncate_text(text, max_len=8000):
    """Truncate text safely for GPT input."""
    return text[:max_len]
