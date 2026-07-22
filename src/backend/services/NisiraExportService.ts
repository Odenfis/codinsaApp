import { getDbPool } from '../../db';
import { DBFFile, FieldDescriptor } from 'dbffile';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { TablaNisira } from '../../types/nisira';

function getFieldDescriptors(): FieldDescriptor[] {
  return [
    { name: 'IDUNICO', type: 'C', size: 200 },
    { name: 'TIPOCOMPRO', type: 'C', size: 200 },
    { name: 'IDDOCUMENT', type: 'C', size: 2 },
    { name: 'SERIE', type: 'C', size: 4 },
    { name: 'NUMERO', type: 'N', size: 18, decimalPlaces: 0 },
    { name: 'ESTADO', type: 'N', size: 10, decimalPlaces: 0 },
    { name: 'IDMONEDASU', type: 'C', size: 3 },
    { name: 'FECHA', type: 'D', size: 8 },
    { name: 'VENCIMIENT', type: 'D', size: 8 },
    { name: 'ESTITULOGR', type: 'N', size: 10, decimalPlaces: 0 },
    { name: 'ESANTICIPO', type: 'N', size: 10, decimalPlaces: 0 },
    { name: 'CONDETRACC', type: 'N', size: 10, decimalPlaces: 0 },
    { name: 'ESEXPORTAC', type: 'N', size: 10, decimalPlaces: 0 },
    { name: 'VALORREFER', type: 'N', size: 20, decimalPlaces: 2 },
    { name: 'IDTIPODETR', type: 'C', size: 2 },
    { name: 'TASADETRAC', type: 'N', size: 8, decimalPlaces: 2 },
    { name: 'TIPODOCUME', type: 'C', size: 1 },
    { name: 'NRODOCUMEN', type: 'C', size: 15 },
    { name: 'RAZONSOCIA', type: 'C', size: 200 },
    { name: 'NOMBRECOME', type: 'C', size: 200 },
    { name: 'DIRECCION', type: 'C', size: 200 },
    { name: 'IDUBIGEO', type: 'C', size: 6 },
    { name: 'DEPARTAMEN', type: 'C', size: 50 },
    { name: 'PROVINCIA', type: 'C', size: 50 },
    { name: 'DISTRITO', type: 'C', size: 50 },
    { name: 'CORREOENVI', type: 'C', size: 100 },
    { name: 'GLOSA', type: 'C', size: 200 },
    { name: 'IDPAIS', type: 'C', size: 2 },
    { name: 'ANTICIPO', type: 'C', size: 10 },
    { name: 'REFERENCIA', type: 'C', size: 30 },
    { name: 'IDPRODUCTO', type: 'C', size: 200 },
    { name: 'IDMEDIDASU', type: 'C', size: 6 },
    { name: 'IDMEDIDA', type: 'C', size: 6 },
    { name: 'DESCRIPCIO', type: 'C', size: 200 },
    { name: 'OBSERVACIO', type: 'C', size: 200 },
    { name: 'CANTIDAD', type: 'N', size: 20, decimalPlaces: 6 },
    { name: 'PRECIO', type: 'N', size: 20, decimalPlaces: 6 },
    { name: 'VVENTA', type: 'N', size: 20, decimalPlaces: 2 },
    { name: 'AFECTO', type: 'N', size: 20, decimalPlaces: 2 },
    { name: 'INAFECTO', type: 'N', size: 20, decimalPlaces: 2 },
    { name: 'EXONERADO', type: 'N', size: 20, decimalPlaces: 2 },
    { name: 'DESCUENTO', type: 'N', size: 20, decimalPlaces: 2 },
    { name: 'IMPUESTO0', type: 'N', size: 20, decimalPlaces: 6 },
    { name: 'IMPUESTO1', type: 'N', size: 20, decimalPlaces: 6 },
    { name: 'IMPUESTO2', type: 'N', size: 20, decimalPlaces: 6 },
    { name: 'IMPUESTO3', type: 'N', size: 20, decimalPlaces: 6 },
    { name: 'PIMPUESTO1', type: 'N', size: 20, decimalPlaces: 6 },
    { name: 'PIMPUESTO2', type: 'N', size: 20, decimalPlaces: 6 },
    { name: 'PIMPUESTO3', type: 'N', size: 20, decimalPlaces: 6 },
    { name: 'IMPORTE', type: 'N', size: 20, decimalPlaces: 2 },
    { name: 'FIRMA1', type: 'C', size: 50 },
    { name: 'FIRMA2', type: 'C', size: 250 },
    { name: 'TIPOPRECIO', type: 'C', size: 1 },
    { name: 'OTROCAMPOA', type: 'C', size: 10 },
    { name: 'OTROCAMPOB', type: 'C', size: 10 },
    { name: 'OTROCAMPOC', type: 'C', size: 20 },
    { name: 'OTROCAMPOD', type: 'C', size: 10 },
    { name: 'OTROCAMPOE', type: 'C', size: 30 },
    { name: 'OTROCAMPOF', type: 'C', size: 15 },
    { name: 'OTROCARGO', type: 'N', size: 20, decimalPlaces: 2 },
    { name: 'NCAMPO3', type: 'N', size: 13, decimalPlaces: 2 },
    { name: 'CCAMPO3', type: 'C', size: 20 },
    { name: 'DIRLLEGADA', type: 'C', size: 100 },
    { name: 'DIRPARTIDA', type: 'C', size: 100 },
    { name: 'UBIGESUCUR', type: 'C', size: 10 },
    { name: 'DRIVERID', type: 'C', size: 11 },
    { name: 'DRIVERDSC', type: 'C', size: 30 },
    { name: 'GROSWEIGHT', type: 'N', size: 13, decimalPlaces: 2 },
    { name: 'MODTRASNPO', type: 'C', size: 2 },
    { name: 'DUA', type: 'C', size: 20 },
    { name: 'BULTOS', type: 'N', size: 10, decimalPlaces: 0 },
    { name: 'BREVETE', type: 'C', size: 10 },
    { name: 'CHOFER', type: 'C', size: 30 },
    { name: 'MOTIVOID', type: 'C', size: 2 },
    { name: 'MOTIVODSC', type: 'C', size: 20 },
    { name: 'PLACA', type: 'C', size: 10 },
    { name: 'MARCA', type: 'C', size: 20 },
    { name: 'CHOFER_DNI', type: 'C', size: 8 },
    { name: 'REGMTC', type: 'C', size: 20 },
    { name: 'LISTAPAGOS', type: 'C', size: 20 },
    { name: 'IDTIPONOTA', type: 'C', size: 2 },
    { name: 'MOTIVOEMIS', type: 'C', size: 100 },
    { name: 'TIPOAFECTA', type: 'C', size: 2 },
    { name: 'FORMAPAGO', type: 'C', size: 20 },
    { name: 'TCAMBIO', type: 'N', size: 10, decimalPlaces: 3 },
    { name: 'GDESCUENTO', type: 'N', size: 13, decimalPlaces: 4 },
  ];
}

const fieldDescriptors = getFieldDescriptors();
const numericFields = new Set(
  fieldDescriptors.filter(f => f.type === 'N').map(f => f.name)
);
const dateFields = new Set(
  fieldDescriptors.filter(f => f.type === 'D').map(f => f.name)
);

function formatDateForDbf(dateVal: string | Date | null): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? null : d;
}

function mapRecord(record: any): Record<string, any> {
  const mapped: Record<string, any> = {};
  for (const key of Object.keys(record)) {
    const val = record[key];
    if (val === null || val === undefined) {
      mapped[key] = null;
      continue;
    }
    if (dateFields.has(key)) {
      mapped[key] = formatDateForDbf(val);
    } else if (numericFields.has(key)) {
      mapped[key] = Number(val);
    } else {
      mapped[key] = val;
    }
  }
  return mapped;
}

export async function getNisiraCount(): Promise<number> {
  const pool = await getDbPool();
  const result = await pool.request()
    .query('SELECT COUNT(*) AS total FROM [dbo].[tablaNisira]');
  return result.recordset[0].total;
}

export async function exportNisiraToDbf(): Promise<{ tempPath: string; count: number; filename: string }> {
  const pool = await getDbPool();
  const result = await pool.request()
    .query('SELECT * FROM [dbo].[tablaNisira]');

  const records: TablaNisira[] = result.recordset;
  const count = records.length;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const filename = `NisiraExport_${dateStr}_${timeStr}.dbf`;
  const tempPath = path.join(os.tmpdir(), filename);

  if (fs.existsSync(tempPath)) {
    fs.unlinkSync(tempPath);
  }

  const dbf = await DBFFile.create(tempPath, fieldDescriptors, { fileVersion: 0x03 });

  if (count > 0) {
    const mapped = records.map(mapRecord);
    await dbf.appendRecords(mapped);
  }

  return { tempPath, count, filename };
}
