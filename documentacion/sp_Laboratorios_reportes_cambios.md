# Reportes Mes Laboratorios: comparación y despliegue del SP

Fecha: 15/10/2026. Procedimiento: `dbo.sp_Laboratorios_reportes(@mes INT, @anio INT)`.

## Archivos entregados y estado

- `sql/backups/sp_Laboratorios_reportes_original.sql`: copia **íntegra, sin editar**, del adjunto proporcionado por el usuario. Se identifica como original por su nombre para conservar también sus bytes y saltos de línea. No sustituye el respaldo del SP que realmente tenga instalado el cliente.
- `sql/sp_Laboratorios_reportes.sql`: versión corregida, con `CREATE OR ALTER`, `SET NOCOUNT ON` y marcador `CODINSA_LABORATORIOS_REPORTES_V3` dentro de la definición.
- La aplicación no instala ni modifica procedimientos. La instalación definitiva queda a cargo del usuario tras comparar con el SP del cliente. El SP local se conserva en su versión anterior; las pruebas de instalación y generación se revierten.

## Mes en letras: esquema actualizado CHAR(15)

La consulta de metadatos del 15/10/2026 confirmó `Mes CHAR(15)` en las quince tablas locales. La adaptación anterior a INT queda reemplazada por V3: las treinta inserciones vuelven a usar el nombre del mes del procedimiento original.

```sql
SELECT 'CODINSA S.A.C.' AS Distribuidor, @nmes AS Mes, ...
```

El CASE conserva los doce nombres en mayúsculas y la escritura `SETIEMBRE`. Se corrige el error original `NOCIEMBRE` a `NOVIEMBRE`. `@nmes CHAR(10)` alcanza para todos los nombres; el relleno de la columna CHAR(15) se elimina al construir la respuesta.

El backend exige `Mes CHAR` con al menos diez caracteres en cada tabla antes de ejecutar el SP. No adapta ni migra el esquema. El marcador V3 evita ejecutar una V2 que insertaría números en las columnas de texto.

El endpoint conserva `{ mes, anio }` y `period.mes` numéricos. Cada fila devuelve `Mes` como texto limpio en mayúsculas y debe coincidir exactamente con el nombre del mes solicitado: valores nulos, números, nombres incorrectos o períodos mezclados hacen fallar la generación antes del commit. Pantalla y exportadores comparten los nombres del selector y los encabezados (`Setiembre 2026`); la columna de detalle muestra `SETIEMBRE` como texto y tiene mayor ancho.

## Diferencia 2: orden de las columnas de IQFarma

El original usa `INSERT INTO tc_IQFarma SELECT ...` sin lista de columnas. SQL Server asigna las expresiones por posición, no por su alias. En la base local:

| Posición | SELECT original | Columna física de destino |
|---|---|---|
| 15 | Ubigeo | fecha |
| 16 | fecha | NroDoc |
| 17 | NroDoc | Codven |
| 18 | Codven | Ubigeo |

Se incorporó una lista explícita de destino, en el orden de las expresiones que ya tenía el SELECT:

```sql
INSERT INTO dbo.tc_IQFarma
    (Distribuidor, Mes, Ruc, Descripcion, codpro, Producto, Cantidad, Total,
     PVendido, PVF, Diferencia, Departamento, Provincia, Distrito,
     Ubigeo, fecha, NroDoc, Codven)
SELECT ...;
```

Esto se aplica a ventas y notas de crédito. Las demás 28 inserciones también declaran sus columnas para independizarlas del orden físico. Se conserva `p.Codlabo` como origen del código en IQFarma, MSN y Qualis; en los demás laboratorios se conserva `dt.codpro`.

## Matriz de columnas por tabla

Las listas siguientes indican el **orden de inserción y lectura del reporte**, que puede diferir del orden físico. Los nombres, tipos y longitudes de la base del cliente deben revisarse antes de instalar.

- **Base:** `Distribuidor, Mes, Ruc, Descripcion, codpro, Producto, Cantidad, Total`.
- **Precios:** `PVendido, PVF, Diferencia`.
- **Ubicación:** `Departamento, Provincia, Distrito`.
- **Documento:** `fecha, NroDoc`.

| Laboratorio | Tabla | Columnas en orden |
|---|---|---|
| CSP | tc_CSP | Base + Precios + Ubicación + Documento + Codven |
| Distoloza | tc_Distoloza | Base + Ubicación + Documento + Codven |
| Faes Farma | tc_Faes | Base + Precios + Ubicación + Documento + Codven |
| IQFarma | tc_IQFarma | Base + Precios + Ubicación + Ubigeo + Documento + Codven |
| ITF | tc_ITF | Base + Ubicación + Documento + Codven |
| Lafage | tc_Lafage | Base + Ubicación + Documento + Codven |
| MSN | tc_MSN | Base + Precios + Ubicación + Documento + Codven |
| Palmagyar | tc_Palma | Base + Ubicación + Documento + Codven |
| Qualis | tc_Qualis | Base + Precios + Ubicación + Documento + Vendedor + Representante |
| Seven | tc_Seven | Base + Precios + Ubicación + Documento + Codven |
| Gabblan | tc_Gabblan | Base + Ubicación + Documento + Codven |
| IntiFarma | tc_IntiFarma | Base + Ubicación + Documento + Codven |
| IntiPeru | tc_IntiPeru | Base + Ubicación + Documento + Codven |
| Apropo | tc_Apropo | Base + Ubicación + Documento + Codven |
| Ipca | tc_Ipca | Base + Ubicación + Documento + Codven |

En local, `Mes` es CHAR(15) y `Codven` es INT; `fecha` es SMALLDATETIME; Cantidad, Total y precios son DECIMAL. RUC, documentos y códigos se presentan como texto. `codpro` es VARCHAR(50) en IQFarma/MSN y CHAR(10) en las demás tablas, incluido Qualis. `Ubigeo` es CHAR(6). No se amplían longitudes ni se truncan códigos para ocultar incompatibilidades; si los datos exceden el esquema, la generación debe fallar y revertirse.

Consulta de metadatos para comparar en el cliente:

```sql
SELECT t.name AS Tabla, c.column_id AS Posicion, c.name AS Columna,
       ty.name AS Tipo, c.max_length AS LongitudBytes,
       c.precision AS Precision, c.scale AS Escala, c.is_nullable AS AdmiteNull
FROM sys.tables t
JOIN sys.columns c ON c.object_id = t.object_id
JOIN sys.types ty ON ty.user_type_id = c.user_type_id
WHERE t.schema_id = SCHEMA_ID('dbo')
  AND t.name IN ('tc_CSP','tc_Distoloza','tc_Faes','tc_IQFarma','tc_ITF',
                'tc_Lafage','tc_MSN','tc_Palma','tc_Qualis','tc_Seven',
                'tc_Gabblan','tc_IntiFarma','tc_IntiPeru','tc_Apropo','tc_Ipca')
ORDER BY t.name, c.column_id;
```

## Qué se conserva

No se modifican filtros de mes/año, prefijos de laboratorio, joins, exclusión de documentos anulados/eliminados, fórmulas, IGV, descuentos, redondeos ni signos. Las notas de crédito conservan la Cantidad y el Total calculados por el SP: no se invierten signos ni se etiquetan los resultados como ventas netas. La fórmula `subtotal / cantidad` se conserva; un dato con cantidad cero puede impedir la generación y debe revisarse en su origen. No hay cambios de esquema ni consultas a servicios externos.

Los cambios de presentación son independientes: mes en letras y año en pantalla/exportaciones, búsqueda, paginación, orden del detalle y etiquetas. La fecha se lee como ISO sin convertir de zona horaria. Los nulos se conservan y se muestran como guion; los totales suman Cantidad y Total disponibles, nunca PVendido/PVF/Diferencia. Se preservan duplicados.

## Instalación manual y restauración

1. En SSMS, conectarse a la base correcta del cliente. Obtener **Script Stored Procedure as → ALTER To → File** de `dbo.sp_Laboratorios_reportes` y guardar un respaldo propio con fecha. Verificar que el archivo contiene la definición completa; no depender de una salida truncada de `PRINT`.
2. Comparar ese respaldo con el original adjunto y con la versión corregida. Ejecutar la consulta de metadatos anterior. Si el cliente tiene diferencias adicionales, detener la instalación y revisarlas; no sobrescribirlas automáticamente.
3. Elegir una ventana coordinada sin otras ejecuciones del reporte. Abrir `sql/sp_Laboratorios_reportes.sql`, verificar la base seleccionada en SSMS y ejecutarlo manualmente. El archivo define el procedimiento y **no lo ejecuta**.
4. Verificar el marcador con `SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.sp_Laboratorios_reportes'));`. El usuario SQL de la aplicación necesita ver esa definición y acceder al procedimiento y a las tablas del reporte.
5. Generar un período conocido desde la pantalla y comparar por laboratorio con el reporte del ERP: filas, códigos, documentos, fechas, importes y ubicaciones. Conservar los resultados de esa revisión.
6. Para restaurar, ejecutar el respaldo **del cliente**, usando ALTER PROCEDURE sobre el procedimiento existente. Esto restaura la definición; no recupera por sí solo los resultados anteriores de las quince tablas. Si se requieren esos resultados exactos, respaldarlos también antes de la primera generación. La aplicación volverá a indicar que falta la versión compatible si se restaura el SP antiguo.

## Transacción y coordinación de la aplicación

El endpoint autenticado `POST /api/reportes/mes-laboratorios` valida `{ mes, anio }` y abre una transacción SERIALIZABLE. Dentro de ella obtiene un `sp_getapplock` exclusivo `CODINSA_LABORATORIOS_REPORTES` con propietario Transaction y espera de 30 segundos, comprueba versión y esquema, ejecuta el SP una sola vez y lee las quince tablas. Confirma después de construir el reporte completo; ante error revierte todo. Timeout por consulta: 300 segundos. No se envían resultados parciales.

Los procesos externos/ERP que ejecuten el mismo SP deben adquirir **el mismo bloqueo**, con el mismo propietario transaccional y dentro de la misma base, antes de ejecutar y leer tablas. El bloqueo no se incorpora al SP para mantener acotado el diff: protege las ejecuciones de la aplicación, y no coordina automáticamente procesos externos que lo ignoren. Fuera de la API, el procedimiento conserva el patrón original DELETE/INSERT sin una transacción interna; el llamador debe envolverlo en una transacción para evitar resultados parciales.

Si el marcador no está instalado, la pantalla informa qué script debe instalarse y no ejecuta el procedimiento. No hay instalación automática, ni al iniciar la aplicación ni al generar el reporte.

## Verificaciones V3 — 15/10/2026

- Pantalla real aislada con datos ficticios: mes en letras, veinte filas por página, cambio a IQFarma, paginación sin nueva generación y período generado estable al cambiar el selector. Revisión visual en escritorio y a 390 px, sin desbordamiento de página.
- Exportadores reales: setiembre, noviembre y diciembre, Excel completo de quince hojas y Excel individual; archivos XLSX reabiertos verifican 45 celdas Mes de texto por hoja. PDF IQFarma de dos páginas por período: nombres y encabezados extraídos; diciembre renderizado y revisado visualmente. No se probó descarga final, impresión física ni circuito HTTP autenticado con V3 instalado permanentemente.
- 86 pruebas automatizadas aprobadas, incluidas diez del reporte. Cobertura de los doce meses en las quince secciones, relleno CHAR, nombres inválidos/nulos/numéricos, períodos vacíos, coincidencia del CASE SQL y listas explícitas. La comparación con el original permite únicamente versionado/despliegue, listas de destino y corrección de noviembre.
- `npm run lint`, `npm run build` y `git diff --check` correctos. El build mantiene la advertencia previa de tamaño del bundle.
- SQL Server local: rechazo de la versión original, instalación temporal V3, generación de octubre de 2026 (quince secciones sin movimientos elegibles), rechazo de Mes INT y CHAR(9). Todo dentro de una transacción revertida. Comparación exacta antes/después de la definición instalada y las filas de las quince tablas.
- Fixtures temporales: doce meses × quince laboratorios × ventas/notas de crédito (360 filas verificadas). Comprobación de mes en letras, cantidad, importe, precios, códigos con ceros y sus orígenes, cada campo de IQFarma, representante Qualis y ubicación nula. Un fallo intencional en el quinto laboratorio seguido de rollback recuperó todas las tablas temporales. Dos generaciones concurrentes (octubre/setiembre) esperaron el mismo bloqueo y devolvieron períodos independientes.

Repetir las pruebas unitarias y técnicas:

```sh
node --import tsx --test src/backend/services/*.test.ts src/utils/*.test.ts
npm run lint
npm run build
git diff --check
```

La verificación SQL es explícita y separada de las pruebas unitarias:

```sh
node --import tsx scripts/verifyMonthlyLaboratoriesReport.ts
```

Usa la conexión configurada en `.env`: requiere una base local de pruebas con el esquema completo, permisos para alterar temporalmente el SP/columna Mes y una ventana sin actividad externa. Todas las modificaciones se revierten; no instala V3 permanentemente. Los fixtures se crean como tablas temporales y desaparecen al cerrar la conexión. No sustituye la comparación de movimientos reales con el ERP del cliente.

## Validaciones históricas V2

La sección 46 de `documentacion/progress.md` conserva el registro previo de 83 pruebas, SQL con mes entero, handler, pantalla y exportaciones. Es evidencia histórica del contrato V2; la compatibilidad actual es V3 con mes textual. La instalación definitiva y comparación en el cliente siguen pendientes.
