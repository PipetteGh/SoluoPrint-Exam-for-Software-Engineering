import zipfile
import xml.etree.ElementTree as ET

def read_docx(file_path):
    try:
        with zipfile.ZipFile(file_path, 'r') as docx:
            xml_content = docx.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            
            # The namespace for w:t (text) in docx
            namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            # Extract all text nodes
            texts = [node.text for node in tree.findall('.//w:t', namespaces) if node.text]
            return ' '.join(texts)
    except Exception as e:
        return str(e)

content = read_docx(r"c:\Users\CMS AI Labs\Pictures\Software Engineering\ProjectOverview.docx")
with open(r"c:\Users\CMS AI Labs\Pictures\Software Engineering\docx_output.txt", "w", encoding="utf-8") as f:
    f.write(content)
