import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCustomersBySalespersonReport, normalizeCustomerBySalespersonRow,
  parseCustomersBySalespersonParameters
} from './customersBySalespersonReport';
import { filterCustomersBySalesperson, summarizeCustomersBySalesperson } from '../../utils/customersBySalespersonModel';

const records = [
  { codclie: '0002 ', Ruc: '20123456789 ', Razon: 'Óptica del Norte', titular: 'Ana Pérez', Direccion: 'Av. Norte 100', Telefono1: '012345678', Telefono2: null, email: 'ventas@example.com', Departamento: 'LIMA', Localidad: 'LOS OLIVOS', Vendedor: 'JUAN VENDEDOR', ubigeo_6d: '150117', Limite: '1500.50', TipoCliente: 'A', RegDigemid: 'RD-2' },
  { codclie: '0001', Ruc: '20600000001', Razon: 'Botica Central', titular: null, Direccion: null, Telefono1: null, Telefono2: null, email: null, Departamento: null, Localidad: null, Vendedor: 'JUAN VENDEDOR', ubigeo_6d: null, Limite: 'inválido', TipoCliente: 'c', RegDigemid: null },
  { codclie: '0003', Ruc: '20600000003', Razon: 'Farmacia Sur', titular: 'Luis Soto', Direccion: 'Calle Sur 10', Telefono1: '987654321', Telefono2: '', email: '', Departamento: 'ICA', Localidad: 'ICA', Vendedor: 'JUAN VENDEDOR', ubigeo_6d: '110101', Limite: 500, TipoCliente: 'B', RegDigemid: 'RD-3' }
];

test('valida que el vendedor sea un entero positivo', () => {
  for (const invalid of [undefined, '', '0', '-1', '1.5', 'abc']) {
    assert.match(parseCustomersBySalespersonParameters(invalid).error || '', /vendedor/);
  }
  assert.deepEqual(parseCustomersBySalespersonParameters(' 12 ').value, { vende: 12 });
});

test('normaliza textos, códigos, límite y valores nulos', () => {
  const mixedCaseRecord = Object.fromEntries(Object.entries(records[1]).map(([key, value]) => [key === 'codclie' ? 'CodClie' : key, value]));
  const row = normalizeCustomerBySalespersonRow(mixedCaseRecord);
  assert.equal(row.codclie, '0001');
  assert.equal(row.titular, '');
  assert.equal(row.Limite, 0);
  assert.equal(row.TipoCliente, 'C');
});

test('ordena clientes y calcula clasificación, ubicación y límite', () => {
  const report = buildCustomersBySalespersonReport(records, { Codemp: 7, Nombre: ' Juan Vendedor ' });
  assert.equal(report.data[0].codclie, '0001');
  assert.deepEqual(report.totals, { clients: 3, located: 2, typeA: 1, typeB: 1, typeC: 1, creditLimit: 2000.5 });
  assert.deepEqual(report.salesperson, { Codemp: 7, Nombre: 'Juan Vendedor' });
});

test('filtra sin distinguir tildes o mayúsculas y resume lo visible', () => {
  const rows = records.map(normalizeCustomerBySalespersonRow);
  const filtered = filterCustomersBySalesperson(rows, 'optica');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].codclie, '0002');
  assert.equal(summarizeCustomersBySalesperson(filtered).creditLimit, 1500.5);
});

test('devuelve un reporte vacío con totales en cero', () => {
  const report = buildCustomersBySalespersonReport([], { Codemp: 7, Nombre: 'Juan Vendedor' });
  assert.equal(report.total, 0);
  assert.deepEqual(report.totals, { clients: 0, located: 0, typeA: 0, typeB: 0, typeC: 0, creditLimit: 0 });
});
