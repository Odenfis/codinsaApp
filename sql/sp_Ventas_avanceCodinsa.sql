SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
ALTER Procedure [dbo].[sp_Ventas_avanceCodinsa]
@labora char(2),@mes int,@anio int
as
set dateformat dmy
select c.Documento as Ruc,c.Razon as Cliente,p.codpro,p.codlab as CodAnte,p.nombre as Producto,dt.Cantidad,dt.Subtotal as Total,
s.nom_dpto as Departamento,s.nom_prov as Provincia,s.nom_dist as Distrito,s.Ubigeo_6D as Ubigeo,
CONVERT(VARCHAR(10), d.fecha, 103) as Fecha,left(t.c_describe,2) as Tipo_doc,
LEFT(d.numero,CHARINDEX('-',d.Numero) - 1) as Serie,SUBSTRING(d.numero, CHARINDEX('-',d.Numero) + 1, LEN(d.numero)) as nro_doc,d.Vendedor
from docdet dt
inner join doccab d on d.numero=dt.numero and d.tipo=dt.tipo
inner join productos p on p.codpro=dt.codpro
inner join clientes c on c.Codclie=d.CodClie
left join t_Clientes_ubigeo u on u.CODIGO=c.Codclie
left join Ubigeos_SUNAT s on convert(int,s.cod_dpto)=u.dpto and convert(int,s.Cod_prov)=u.provincia  and convert(int,s.cod_dist)=u.distrito
inner join tablas t on t.n_codtabla=3 and t.n_numero=d.tipo
where month(d.fecha)=@mes and year(d.fecha)=@anio and left(dt.codpro,2)=@labora
GO
