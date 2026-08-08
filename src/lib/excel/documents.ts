import ExcelJS from "exceljs";
import { BRAND_COLORS, BRAND_LOGO } from "@/lib/brand";
import { readFile } from "fs/promises";
import path from "path";

// Formate les couleurs hexadécimales avec canal alpha (FF) pour ExcelJS
function toExcelColor(hex: string): string {
  return "FF" + hex.replace("#", "").toUpperCase();
}

const EXCEL_COLOR = {
  lapis: toExcelColor(BRAND_COLORS.lapis),
  lapisPale: toExcelColor(BRAND_COLORS.lapisPale),
  or: toExcelColor(BRAND_COLORS.or),
  orPale: toExcelColor(BRAND_COLORS.orPale),
  ambre: toExcelColor(BRAND_COLORS.ambre),
  ambrePale: toExcelColor(BRAND_COLORS.ambrePale),
  porcelaine: toExcelColor(BRAND_COLORS.porcelaine),
  ligne: toExcelColor(BRAND_COLORS.ligne),
  carmin: toExcelColor(BRAND_COLORS.carmin),
  carminPale: toExcelColor(BRAND_COLORS.carminPale),
  encre: toExcelColor(BRAND_COLORS.encre),
  ardoise: toExcelColor(BRAND_COLORS.ardoise),
  blanc: toExcelColor(BRAND_COLORS.blanc),
};

export type ExcelListingColumn = { 
  header: string; 
  key: string; 
  width: number; // largeur en caractères
};

export type ExcelListingInput = {
  titre: string;
  sousTitre?: string;
  generatedAtStr: string;
  generatedBy: string;
  columns: ExcelListingColumn[];
  rows: any[]; // Tableaux de valeurs correspondant aux colonnes
};

/**
 * Génère un buffer pour un fichier Excel (.xlsx) stylisé aux couleurs
 * de la marque (GET Admission), reprenant la même structure que les PDF.
 */
export async function buildExcelListingBuffer(input: ExcelListingInput): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GET Admission";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(input.titre, {
    views: [{ showGridLines: false }],
  });

  // --- 1. En-tête (Logo + Titres) ---
  worksheet.getRow(1).height = 45;
  worksheet.getRow(2).height = 8; // Ligne verte de séparation

  let logoId: number | null = null;
  try {
    const logoBuffer = await readFile(path.join(process.cwd(), BRAND_LOGO.fsPath));
    logoId = workbook.addImage({
      buffer: logoBuffer as any,
      extension: "png",
    });
  } catch (e) {
    console.error("Impossible de charger le logo pour l'export Excel", e);
  }

  // Largeur par défaut des colonnes pour gérer l'affichage de l'en-tête
  const lastCol = input.columns.length > 3 ? input.columns.length : 4;
  const lastColLetter = worksheet.getColumn(lastCol).letter;

  if (logoId !== null) {
    // Insère le logo dans le coin gauche
    worksheet.addImage(logoId, {
      tl: { col: 0, row: 0 },
      ext: { width: 140, height: 42 },
    });
  }

  // Titre principal et informations alignés à droite
  worksheet.mergeCells(`B1:${lastColLetter}1`);
  const headerCell = worksheet.getCell(`B1`);
  
  headerCell.value = {
    richText: [
      { text: input.titre + "\n", font: { name: 'Arial', size: 16, bold: true, color: { argb: EXCEL_COLOR.or } } },
      { text: (input.sousTitre ? input.sousTitre + " · " : "") + `Généré le ${input.generatedAtStr} par ${input.generatedBy}`, font: { name: 'Arial', size: 9, color: { argb: EXCEL_COLOR.ardoise } } },
    ]
  };
  headerCell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };

  // --- 2. Ligne de marque verte ---
  worksheet.mergeCells(`A2:${lastColLetter}2`);
  const brandLine = worksheet.getCell(`A2`);
  brandLine.border = {
    bottom: { style: 'medium', color: { argb: EXCEL_COLOR.lapis } }
  };
  
  // Espace avant tableau
  worksheet.getRow(3).height = 15;

  // --- 3. Configuration des colonnes et en-têtes ---
  const tableStartRow = 4;
  worksheet.columns = input.columns.map(col => ({
    header: col.header.toUpperCase(),
    key: col.key,
    width: col.width,
  }));
  
  worksheet.getRow(tableStartRow).values = input.columns.map(c => c.header.toUpperCase());

  // Styler les en-têtes de colonnes
  const headerRow = worksheet.getRow(tableStartRow);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: EXCEL_COLOR.ardoise } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EXCEL_COLOR.porcelaine }
    };
    cell.border = {
      bottom: { style: 'thin', color: { argb: EXCEL_COLOR.ligne } }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  });

  // --- 4. Données ---
  input.rows.forEach((rowData, index) => {
    const row = worksheet.addRow(rowData);
    row.height = 20;
    
    // Alternance des lignes (Zebra striping)
    if (index % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: "FFF9FAFB" } // Gris très clair pour contraster avec la porcelaine
        };
      });
    }

    row.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, color: { argb: EXCEL_COLOR.encre } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
      
      // Styling conditionnel pour les statuts
      const val = cell.value?.toString().toLowerCase();
      if (val && ["actif", "payé", "reussi"].includes(val)) {
         cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: EXCEL_COLOR.lapis } };
      } else if (val && ["désactivé", "échoué", "annulé", "manquante"].includes(val)) {
         cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: EXCEL_COLOR.carmin } };
      } else if (val && ["en attente", "a corriger", "initié"].includes(val)) {
         cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: EXCEL_COLOR.ambre } };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as any;
}
