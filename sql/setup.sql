create view gastos_vw as
select
    dv.DESCRIPCION as division,
    gv.descripcion as grupo,
    cv.descripcion as clase,
    sv.descripcion as subclase,
    av.descripcion as articulo,
    sum(monto * pondera) as monto,
    -- el número arbitrario es un hack para solucionar un error de redondeo en decimales de más de 15 cifras
    -- el total sumado daba 101.689 entonces dividiendo por ese número el total da 100%
    cast(sum(monto * pondera) / gasto_total as text) / 1.016892144441447 as porcentaje
from
    gastos gc
    join divisiones_vw dv on gc.division = dv.CLAVE
    join grupos_vw gv on gc.grupo = gv.CLAVE
    join clases_vw cv on gc.clase = cv.CLAVE
    join subclases_vw sv on gc.subclase = sv.CLAVE
    join articulos_vw av on gc.articulo = av.CLAVE
    join (select
            cast(sum(monto * pondera) as text) as gasto_total
	      from
	        gastos) t
group by
    dv.DESCRIPCION,
    gv.DESCRIPCION,
    cv.DESCRIPCION,
    sv.DESCRIPCION,
    av.DESCRIPCION
order by
    division,
    grupo,
    clase,
    subclase,
    articulo;

create view divisiones_vw as
select distinct
	division clave,
	division_desc descripcion
	from articulos a;

create view grupos_vw as
select distinct
	grupo clave,
	grupo_desc descripcion
	from articulos a;

create view clases_vw as
select distinct
	clase clave,
	clase_desc descripcion
	from articulos a;

create view subclases_vw as
select distinct
	subclase clave,
	subclase_desc descripcion
	from articulos a;

create view articulos_vw as
select distinct
	articulo clave,
	articulo_desc descripcion
	from articulos a;