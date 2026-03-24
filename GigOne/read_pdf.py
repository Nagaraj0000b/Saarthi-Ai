import PyPDF2
reader = PyPDF2.PdfReader("Feature Components - Sheet1.pdf")
for page_num, page in enumerate(reader.pages, start=1):
    text = page.extract_text()
    if text:
        safe = text.encode('utf-8', errors='replace').decode()
        print(f"--- page {page_num} ---")
        print(safe)
