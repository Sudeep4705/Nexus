import XLSX from "xlsx";
import { Document } from "@langchain/core/documents";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";


export async function fileToDocuments(filepath,buffer) {
  const extension = filepath.split('.').pop().toLowerCase();
  
  // --- Excel files ---
  if (extension === 'xlsx' || extension === 'xls') {
    const workbook = XLSX.read(buffer,{type:"buffer"});
    //console.log(workbook);

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    return rows.map((row, index) => {
      const text = Object.entries(row)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");        
      return new Document({
        pageContent: text,
        metadata: {
          source: filepath,
          rowIndex: index,
          ...row,
        },
      });
    });
  }

  // --- PDF files ---
  if (extension === 'pdf'){
    const loader = new PDFLoader(new Blob([buffer]), { splitPages: false });
    const docs = await loader.load();
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 100,
    });
    const chunks = await splitter.splitDocuments(docs);
    return chunks;
  }
  // --- Unsupported file type ---
  throw new Error(`Unsupported file type: ${extension}`);
}