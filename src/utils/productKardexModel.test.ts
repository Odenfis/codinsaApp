import test from 'node:test';
import assert from 'node:assert/strict';
import { groupKardex, kardexPage, kardexPeriod, sumKardex } from './productKardexModel';
import { KardexProductoRow } from '../types';
const row = (code: string, lab: string, name='Producto'): KardexProductoRow => ({ LaboratorioCodigo: lab, Laboratorio: lab ? `Lab ${lab}` : '', FecIni:'',FecFin:'',codpro:code,codSunat:'000',Producto:name,Unimed:'NIU',Saldoini:-1.5,Ingresos:2.25,salidas:.5,saldoFin:.25,Costo:1,Valor:1.75 });
test('agrupa sin consolidar filas, ordena y conserva códigos y cantidades',()=>{
 const rows=[row('00002','02'),row('00001','01','Z'),row('00001','01','Ácido'),row('00000','')];
 const groups=groupKardex(rows);
 assert.equal(groups.flatMap(g=>g.rows).length,4);
 assert.equal(groups[0].code,'01');assert.equal(groups[0].rows[0].Producto,'Ácido');
 assert.equal(groups.find(g=>g.code==='')!.name,'Sin laboratorio');
 assert.deepEqual(sumKardex(groups.flatMap(g=>g.rows)),sumKardex(rows));
 assert.equal(sumKardex(rows).Saldoini,-6);assert.equal(sumKardex(rows).Valor,7);
 assert.equal(groups[0].rows[0].codpro,'00001');assert.equal(rows[1].Producto,'Z');
});
test('página 2 repite grupo y solo cierra con subtotal al terminar',()=>{
 const groups=groupKardex(Array.from({length:25},(_,i)=>row(String(i).padStart(5,'0'),'01')));
 const first=kardexPage(groups,1),second=kardexPage(groups,2);
 assert.equal(first.filter(l=>l.kind==='product').length,20);assert.equal(first.some(l=>l.kind==='subtotal'),false);
 assert.deepEqual(second[0],{kind:'laboratory',name:'Lab 01',continued:true});
 assert.equal(second.filter(l=>l.kind==='product').length,5);assert.equal(second.filter(l=>l.kind==='subtotal').length,1);
 assert.equal(second.at(-1)!.kind,'total');
});
test('grupo que termina en límite tiene subtotal, próximo grupo inicia en siguiente página',()=>{
 const groups=groupKardex([...Array.from({length:20},(_,i)=>row(String(i),'01')),row('21','02')]);
 assert.equal(kardexPage(groups,1).at(-1)!.kind,'subtotal');
 assert.deepEqual(kardexPage(groups,2)[0],{kind:'laboratory',name:'Lab 02',continued:false});
});
test('vacío y periodo sin zona horaria',()=>{
 assert.deepEqual(groupKardex([]),[]);assert.deepEqual(kardexPage([],1),[]);
 assert.deepEqual(sumKardex([]),{Saldoini:0,Ingresos:0,salidas:0,saldoFin:0,Valor:0});
 assert.equal(kardexPeriod({data:[],total:0,totals:sumKardex([]),period:{mes:2,anio:2024,desde:'2024-02-01',hasta:'2024-02-29'}}),'Del 01/02/2024 al 29/02/2024');
});
