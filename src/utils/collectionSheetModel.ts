import { PlanillaCobranzaItem, PlanillaCobranzaResponse } from '../types';

export const COLLECTION_SHEET_PAGE_SIZE = 15;

export const collectionSheetMoney = (value: number) => Number.isFinite(value) ? value : 0;

export const collectionSheetDeposit = (item: PlanillaCobranzaItem) =>
  collectionSheetMoney(item.Deposito);

export const collectionSheetCollected = (item: PlanillaCobranzaItem) =>
  collectionSheetMoney(item.Descuento) + collectionSheetMoney(item.Efectivo) +
  collectionSheetDeposit(item) + collectionSheetMoney(item.Letra) +
  collectionSheetMoney(item.Transferencia) + collectionSheetMoney(item.Cheque);

export const deriveCollectionSheetLocation = (items: PlanillaCobranzaItem[]) => {
  const locations = [...new Set(items.map(item => item.Lugar.trim()).filter(Boolean))];
  if (!locations.length) return '';
  return locations.length === 1 ? locations[0] : 'VARIAS';
};

export const documentCode = (value: number) => Number.isFinite(value) && value > 0 ? String(value) : '';

export interface CollectionSheetPaymentRow {
  amount: number;
  reference: string;
  date: string;
  bank: string;
}

export interface CollectionSheetPresentation {
  location: string;
  pages: PlanillaCobranzaItem[][];
  deposits: CollectionSheetPaymentRow[];
  transfers: CollectionSheetPaymentRow[];
  checks: CollectionSheetPaymentRow[];
  totals: {
    descuento: number;
    efectivo: number;
    deposito: number;
    letra: number;
    transferencia: number;
    cheque: number;
    cobrado: number;
  };
}

export const buildCollectionSheetPresentation = (report: PlanillaCobranzaResponse): CollectionSheetPresentation => {
  const pages: PlanillaCobranzaItem[][] = [];
  for (let index = 0; index < report.items.length; index += COLLECTION_SHEET_PAGE_SIZE) {
    pages.push(report.items.slice(index, index + COLLECTION_SHEET_PAGE_SIZE));
  }
  if (!pages.length) pages.push([]);

  const deposits = report.items
    .filter(item => collectionSheetDeposit(item) !== 0)
    .map(item => ({
      amount: collectionSheetDeposit(item),
      reference: item.NroOperacion,
      date: item.FechaFac,
      bank: item.Banco || item.CtaBanco
    }));
  const checks = report.items
    .filter(item => collectionSheetMoney(item.Cheque) !== 0)
    .map(item => ({
      amount: collectionSheetMoney(item.Cheque),
      reference: item.NroCheque,
      date: item.FechaFac,
      bank: item.Banco || item.CtaBanco
    }));
  const transfers = report.items
    .filter(item => collectionSheetMoney(item.Transferencia) !== 0)
    .map(item => ({
      amount: collectionSheetMoney(item.Transferencia),
      reference: item.NroOperacion,
      date: item.FechaFac,
      bank: item.Banco || item.CtaBanco
    }));

  const totals = report.items.reduce((sum, item) => ({
    descuento: sum.descuento + collectionSheetMoney(item.Descuento),
    efectivo: sum.efectivo + collectionSheetMoney(item.Efectivo),
    deposito: sum.deposito + collectionSheetDeposit(item),
    letra: sum.letra + collectionSheetMoney(item.Letra),
    transferencia: sum.transferencia + collectionSheetMoney(item.Transferencia),
    cheque: sum.cheque + collectionSheetMoney(item.Cheque),
    cobrado: sum.cobrado + collectionSheetCollected(item)
  }), { descuento: 0, efectivo: 0, deposito: 0, letra: 0, transferencia: 0, cheque: 0, cobrado: 0 });

  return { location: deriveCollectionSheetLocation(report.items), pages, deposits, transfers, checks, totals };
};
