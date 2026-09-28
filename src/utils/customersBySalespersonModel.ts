import { CustomersBySalespersonRow, CustomersBySalespersonTotals } from '../types';

const searchable = (value: string) => value
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-PE');

export function filterCustomersBySalesperson(rows: CustomersBySalespersonRow[], search: string) {
  const term = searchable(search.trim());
  if (!term) return rows;
  return rows.filter(row => searchable([
    row.codclie, row.Ruc, row.Razon, row.titular, row.Direccion, row.Telefono1,
    row.Telefono2, row.email, row.Departamento, row.Localidad, row.Vendedor,
    row.ubigeo_6d, row.TipoCliente, row.RegDigemid
  ].join(' ')).includes(term));
}

export function summarizeCustomersBySalesperson(rows: CustomersBySalespersonRow[]): CustomersBySalespersonTotals {
  return {
    clients: rows.length,
    located: rows.filter(row => Boolean(row.ubigeo_6d)).length,
    typeA: rows.filter(row => row.TipoCliente === 'A').length,
    typeB: rows.filter(row => row.TipoCliente === 'B').length,
    typeC: rows.filter(row => row.TipoCliente === 'C').length,
    creditLimit: rows.reduce((sum, row) => sum + row.Limite, 0)
  };
}
