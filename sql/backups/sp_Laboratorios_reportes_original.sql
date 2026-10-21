SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
ALTER Procedure [dbo].[sp_Laboratorios_reportes]
@mes int,@anio int
as
declare @labo char(2),@nmes char(10),@igv decimal(9,2)
--Lista de laboratorios
/*
CSP 37
Distoloza 42
Faes Farma 59
iqfarma R1,87,R2,88
ITF 89
LAFAGE B2
MSN F2,F3
PALMAGYAR F7
QUALIS H2
SEVEN T9
-- Pedro Marchena igual al ITF
Gabblan 65
IntiPharma 84
Inti Peru 83
Apropo 10
IPCA 85,86
*/
SET @nmes=(case @mes
 when 1 then 'ENERO'
 when 2 then 'FEBRERO'
 when 3 then 'MARZO'
 when 4 then 'ABRIL'
 when 5 then 'MAYO'
 when 6 then 'JUNIO'
 when 7 then 'JULIO'
 when 8 then 'AGOSTO'
 when 9 then 'SETIEMBRE'
 when 10 then 'OCTUBRE'
 when 11 then 'NOCIEMBRE'
 when 12 then 'DICIEMBRE'
END)
set @igv=(select n_valor from valores where c_valor='Igv')
set @labo='37'
-- ventas  laboratorio 37
delete tc_CSP
insert into tc_CSP
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
round((dt.subtotal/dt.cantidad),2) as PVendido,round(p.PventaMa*(1+@igv/100),2) as PVF,
round(p.PventaMa*(1+@igv/100),2)-round((dt.subtotal/dt.cantidad),2) as Diferencia,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,dc.Vendedor as Codven
from docdet dt inner join doccab dc on dc.numero=dt.numero and dc.tipo=dt.tipo
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.Eliminado=0 and left(dt.codpro,2)=@labo and month(dc.Fecha)=@mes and year(dc.fecha)=@anio

-- notas de credito Laboratorio 37
insert into tc_CSP
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
round((dt.subtotal/dt.cantidad),2) as PVendido,round(p.PventaMa*(1+@igv/100),2) as PVF,
round(p.PventaMa*(1+@igv/100),2)-round((dt.subtotal/dt.cantidad),2) as Diferencia,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,doccab.Vendedor as Codven
from Notas_credito_deta dt inner join Notas_credito dc on dc.numero=dt.numero
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
inner join doccab on doccab.numero=dc.Documento and doccab.tipo=dc.TipoDoc
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.anulado=0 and left(dt.codpro,2)=@labo and month(dc.Fecha)=@mes and year(dc.fecha)=@anio

set @labo='42'
-- ventas  laboratorio 42
delete tc_Distoloza
insert into tc_Distoloza
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,dc.Vendedor as Codven
from docdet dt inner join doccab dc on dc.numero=dt.numero and dc.tipo=dt.tipo
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.Eliminado=0 and left(dt.codpro,2)=@labo and month(dc.Fecha)=@mes and year(dc.fecha)=@anio

-- notas de credito Laboratorio 42
insert into tc_Distoloza
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,doccab.Vendedor as Codven
from Notas_credito_deta dt inner join Notas_credito dc on dc.numero=dt.numero
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
inner join doccab on doccab.numero=dc.Documento and doccab.tipo=dc.TipoDoc
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.anulado=0 and left(dt.codpro,2)=@labo and month(dc.Fecha)=@mes and year(dc.fecha)=@anio

set @labo='59'
-- ventas  laboratorio 59
delete tc_Faes
insert into tc_Faes
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
round((dt.subtotal/dt.cantidad),2) as PVendido,round(p.PventaMa*(1+@igv/100),2) as PVF,
round(p.PventaMa*(1+@igv/100),2)-round((dt.subtotal/dt.cantidad),2) as Diferencia,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,dc.Vendedor as Codven
from docdet dt inner join doccab dc on dc.numero=dt.numero and dc.tipo=dt.tipo
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.Eliminado=0 and left(dt.codpro,2)=@labo and month(dc.Fecha)=@mes and year(dc.fecha)=@anio

-- notas de credito Laboratorio 59
insert into tc_Faes
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
round((dt.subtotal/dt.cantidad),2) as PVendido,round(p.PventaMa*(1+@igv/100),2) as PVF,
round(p.PventaMa*(1+@igv/100),2)-round((dt.subtotal/dt.cantidad),2) as Diferencia,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,doccab.Vendedor as Codven
from Notas_credito_deta dt inner join Notas_credito dc on dc.numero=dt.numero
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
inner join doccab on doccab.numero=dc.Documento and doccab.tipo=dc.TipoDoc
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.anulado=0 and left(dt.codpro,2)=@labo and month(dc.Fecha)=@mes and year(dc.fecha)=@anio

set @labo=''
-- ventas  laboratorio R1,87,R2,88
delete tc_IQFarma
insert into tc_IQFarma
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,p.Codlabo,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
round((dt.subtotal/dt.cantidad),2) as PVendido,round(p.PventaMa*(1+@igv/100),2) as PVF,
round(p.PventaMa*(1+@igv/100),2)-round((dt.subtotal/dt.cantidad),2) as Diferencia,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,s.Ubigeo_6D as Ubigeo,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,dc.Vendedor as Codven
from docdet dt inner join doccab dc on dc.numero=dt.numero and dc.tipo=dt.tipo
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.Eliminado=0 and  left(dt.codpro,2) in ('R1','87','R2','88')  and month(dc.Fecha)=@mes and year(dc.fecha)=@anio

-- notas de credito Laboratorio R1,87,R2,88
insert into tc_IQFarma
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,p.codlabo,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
round((dt.subtotal/dt.cantidad),2) as PVendido,round(p.PventaMa*(1+@igv/100),2) as PVF,
round(p.PventaMa*(1+@igv/100),2)-round((dt.subtotal/dt.cantidad),2) as Diferencia,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,s.Ubigeo_6D as Ubigeo,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,doccab.Vendedor as Codven
from Notas_credito_deta dt inner join Notas_credito dc on dc.numero=dt.numero
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
inner join doccab on doccab.numero=dc.Documento and doccab.tipo=dc.TipoDoc
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.anulado=0 and left(dt.codpro,2) in ('R1','87','R2','88') and month(dc.fecha)=@mes and year(dc.fecha)=@anio

-- Ventas ITF
set @labo='89'
delete tc_ITF
insert into tc_ITF
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,dc.Vendedor as Codven
from docdet dt inner join doccab dc on dc.numero=dt.numero and dc.tipo=dt.tipo
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.Eliminado=0 and left(dt.codpro,2)=@labo and month(dc.Fecha)=@mes and year(dc.fecha)=@anio
-- Notas de Credito ITF
insert into tc_ITF
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,doccab.Vendedor as Codven
from Notas_credito_deta dt inner join Notas_credito dc on dc.numero=dt.numero
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
inner join doccab on doccab.numero=dc.Documento and doccab.tipo=dc.TipoDoc
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.anulado=0 and left(dt.codpro,2)=@labo and month(dc.Fecha)=@mes and year(dc.fecha)=@anio

set @labo='B2'
-- ventas  laboratorio B2
delete tc_Lafage
insert into tc_Lafage
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,dc.Vendedor as Codven
from docdet dt inner join doccab dc on dc.numero=dt.numero and dc.tipo=dt.tipo
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.Eliminado=0 and left(dt.codpro,2)=@labo and month(dc.Fecha)=@mes and year(dc.fecha)=@anio
-- notas de credito Laboratorio B2
insert into tc_Lafage
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,doccab.Vendedor as Codven
from Notas_credito_deta dt inner join Notas_credito dc on dc.numero=dt.numero
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
inner join doccab on doccab.numero=dc.Documento and doccab.tipo=dc.TipoDoc
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.anulado=0 and left(dt.codpro,2)=@labo and month(dc.Fecha)=@mes and year(dc.fecha)=@anio

set @labo=''
-- ventas  laboratorio F2,F3
delete tc_MSN
insert into tc_MSN
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,p.Codlabo,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
round((dt.subtotal/dt.cantidad),2) as PVendido,round(p.PventaMa*(1+@igv/100),2) as PVF,
round(p.PventaMa*(1+@igv/100),2)-round((dt.subtotal/dt.cantidad),2) as Diferencia,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,dc.Vendedor as Codven
from docdet dt inner join doccab dc on dc.numero=dt.numero and dc.tipo=dt.tipo
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.Eliminado=0 and left(dt.codpro,2) in ('F2','F3')  and month(dc.Fecha)=@mes and year(dc.fecha)=@anio

-- notas de credito Laboratorio F2,F3
insert into tc_MSN
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,p.codlabo,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
round((dt.subtotal/dt.cantidad),2) as PVendido,round(p.PventaMa*(1+@igv/100),2) as PVF,
round(p.PventaMa*(1+@igv/100),2)-round((dt.subtotal/dt.cantidad),2) as Diferencia,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,doccab.Vendedor as Codven
from Notas_credito_deta dt inner join Notas_credito dc on dc.numero=dt.numero
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
inner join doccab on doccab.numero=dc.Documento and doccab.tipo=dc.TipoDoc
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.anulado=0 and left(dt.codpro,2) in ('F2','F3') and month(dc.fecha)=@mes and year(dc.fecha)=@anio

set @labo='F7'
-- ventas  laboratorio F7
delete tc_Palma
insert into tc_Palma
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,dc.Vendedor as Codven
from docdet dt inner join doccab dc on dc.numero=dt.numero and dc.tipo=dt.tipo
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.Eliminado=0 and left(dt.codpro,2)=@labo and month(dc.Fecha)=@mes and year(dc.fecha)=@anio

-- notas de credito Laboratorio F7
insert into tc_Palma
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,doccab.Vendedor as Codven
from Notas_credito_deta dt inner join Notas_credito dc on dc.numero=dt.numero
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
inner join doccab on doccab.numero=dc.Documento and doccab.tipo=dc.TipoDoc
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.anulado=0 and left(dt.codpro,2)=@labo and month(dc.Fecha)=@mes and year(dc.fecha)=@anio

set @labo='H2'
-- ventas  laboratorio H2
delete tc_Qualis
insert into tc_Qualis
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,p.Codlabo,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
round((dt.subtotal/dt.cantidad),2) as PVendido,round(p.PventaMa*(1+@igv/100),2) as PVF,
round(p.PventaMa*(1+@igv/100),2)-round((dt.subtotal/dt.cantidad),2) as Diferencia,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,empleados.Nombre as Vendedor,r.Nombre as Representante
from docdet dt inner join doccab dc on dc.numero=dt.numero and dc.tipo=dt.tipo
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
inner join empleados on empleados.Codemp=dc.Vendedor
inner join doccabped on doccabped.numero=dc.NroPedido
left join representantes r on r.Codigo=doccabped.Representante
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.Eliminado=0 and  left(dt.codpro,2)=@labo  and month(dc.Fecha)=@mes and year(dc.fecha)=@anio

-- notas de credito Laboratorio H2
insert into tc_Qualis
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,p.codlabo,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
round((dt.subtotal/dt.cantidad),2) as PVendido,round(p.PventaMa*(1+@igv/100),2) as PVF,
round(p.PventaMa*(1+@igv/100),2)-round((dt.subtotal/dt.cantidad),2) as Diferencia,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,Empleados.Nombre as Vendedor,r.Nombre as Representante
from Notas_credito_deta dt inner join Notas_credito dc on dc.numero=dt.numero
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
inner join doccab on doccab.numero=dc.Documento and doccab.tipo=dc.TipoDoc
inner join empleados on empleados.Codemp=doccab.Vendedor
inner join doccabped on doccabped.numero=doccab.NroPedido
left join representantes r on r.Codigo=doccabped.Representante
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.anulado=0 and left(dt.codpro,2)=@labo and month(dc.fecha)=@mes and year(dc.fecha)=@anio

set @labo='T9'
-- ventas  laboratorio T9
delete tc_Seven
insert into tc_Seven
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
round((dt.subtotal/dt.cantidad),2) as PVendido,round(p.PventaMa*(1+@igv/100),2) as PVF,
round(p.PventaMa*(1+@igv/100),2)-round((dt.subtotal/dt.cantidad),2) as Diferencia,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,dc.Vendedor as Codven
from docdet dt inner join doccab dc on dc.numero=dt.numero and dc.tipo=dt.tipo
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.Eliminado=0 and left(dt.codpro,2)=@labo and month(dc.Fecha)=@mes and year(dc.fecha)=@anio

-- notas de credito Laboratorio T9
insert into tc_Seven
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
round((dt.subtotal/dt.cantidad),2) as PVendido,round(p.PventaMa*(1+@igv/100),2) as PVF,
round(p.PventaMa*(1+@igv/100),2)-round((dt.subtotal/dt.cantidad),2) as Diferencia,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,doccab.Vendedor as Codven
from Notas_credito_deta dt inner join Notas_credito dc on dc.numero=dt.numero
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
inner join doccab on doccab.numero=dc.Documento and doccab.tipo=dc.TipoDoc
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.anulado=0 and left(dt.codpro,2)=@labo and month(dc.Fecha)=@mes and year(dc.fecha)=@anio


-- agregados de los reportes que maneja el contador
/*
Gabblan 65
IntiPharma 84
Inti Peru 83
Apropo 10
IPCA 85,86

select * into tc_Gabblan from tc_ITF
select * into tc_IntiFarma from tc_ITF
select * into tc_IntiPeru from tc_ITF
select * into tc_Apropo from tc_ITF
select * into tc_Ipca from tc_ITF
*/
-- Ventas gabblan
set @labo='65'
delete tc_Gabblan
insert into tc_Gabblan
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,dc.Vendedor as Codven
from docdet dt inner join doccab dc on dc.numero=dt.numero and dc.tipo=dt.tipo
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.Eliminado=0 and left(dt.codpro,2)=@labo and month(dc.Fecha)=@mes and year(dc.fecha)=@anio
-- Notas de Credito Gabblan
insert into tc_Gabblan
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,doccab.Vendedor as Codven
from Notas_credito_deta dt inner join Notas_credito dc on dc.numero=dt.numero
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
inner join doccab on doccab.numero=dc.Documento and doccab.tipo=dc.TipoDoc
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.anulado=0 and left(dt.codpro,2)=@labo and month(dc.Fecha)=@mes and year(dc.fecha)=@anio

-- Ventas IntiFarma
set @labo='84'
delete tc_IntiFarma
insert into tc_IntiFarma
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,dc.Vendedor as Codven
from docdet dt inner join doccab dc on dc.numero=dt.numero and dc.tipo=dt.tipo
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.Eliminado=0 and left(dt.codpro,2)=@labo and month(dc.Fecha)=@mes and year(dc.fecha)=@anio
-- Notas de Credito Intifarma
insert into tc_IntiFarma
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,doccab.Vendedor as Codven
from Notas_credito_deta dt inner join Notas_credito dc on dc.numero=dt.numero
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
inner join doccab on doccab.numero=dc.Documento and doccab.tipo=dc.TipoDoc
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.anulado=0 and left(dt.codpro,2)=@labo and month(dc.Fecha)=@mes and year(dc.fecha)=@anio

-- Ventas Intiperu
set @labo='83'
delete tc_IntiPeru
insert into tc_IntiPeru
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,dc.Vendedor as Codven
from docdet dt inner join doccab dc on dc.numero=dt.numero and dc.tipo=dt.tipo
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.Eliminado=0 and left(dt.codpro,2)=@labo and month(dc.Fecha)=@mes and year(dc.fecha)=@anio
-- Notas de Credito Intiperu
insert into tc_IntiPeru
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,doccab.Vendedor as Codven
from Notas_credito_deta dt inner join Notas_credito dc on dc.numero=dt.numero
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
inner join doccab on doccab.numero=dc.Documento and doccab.tipo=dc.TipoDoc
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.anulado=0 and left(dt.codpro,2)=@labo and month(dc.Fecha)=@mes and year(dc.fecha)=@anio

-- Ventas Apropo
set @labo='10'
delete tc_Apropo
insert into tc_Apropo
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,dc.Vendedor as Codven
from docdet dt inner join doccab dc on dc.numero=dt.numero and dc.tipo=dt.tipo
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.Eliminado=0 and left(dt.codpro,2)=@labo and month(dc.Fecha)=@mes and year(dc.fecha)=@anio
-- Notas de Credito Apropo
insert into tc_Apropo
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,doccab.Vendedor as Codven
from Notas_credito_deta dt inner join Notas_credito dc on dc.numero=dt.numero
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
inner join doccab on doccab.numero=dc.Documento and doccab.tipo=dc.TipoDoc
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.anulado=0 and left(dt.codpro,2)=@labo and month(dc.Fecha)=@mes and year(dc.fecha)=@anio

-- Ventas Ipca
set @labo=''
delete tc_Ipca
insert into tc_Ipca
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,dc.Vendedor as Codven
from docdet dt inner join doccab dc on dc.numero=dt.numero and dc.tipo=dt.tipo
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.Eliminado=0 and left(dt.codpro,2) in ('85','86') and month(dc.Fecha)=@mes and year(dc.fecha)=@anio
-- Notas de Credito Ipca
insert into tc_Ipca
select 'CODINSA S.A.C.' as Distribuidor,@nmes as Mes,c.documento as Ruc,c.Razon as Descripcion,dt.codpro,p.Nombre as Producto,
dt.Cantidad,round(dt.cantidad*dt.Precio*(1-dt.Descuento1/100)*(1-dt.Descuento2/100)*(1-dt.Descuento3/100),2) as Total,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,dc.fecha,
SUBSTRING(dc.numero, CHARINDEX('-',dc.Numero) + 1, LEN(dc.numero)) as NroDoc,doccab.Vendedor as Codven
from Notas_credito_deta dt inner join Notas_credito dc on dc.numero=dt.numero
inner join clientes c on c.Codclie=dc.CodClie
inner join productos p on p.Codpro=dt.codpro
inner join doccab on doccab.numero=dc.Documento and doccab.tipo=dc.TipoDoc
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
where dc.anulado=0 and left(dt.codpro,2) in ('85','86') and month(dc.Fecha)=@mes and year(dc.fecha)=@anio
GO