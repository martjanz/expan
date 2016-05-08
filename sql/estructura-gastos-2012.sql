select
    dv.DESCRIPCION as division,
    gv.descripcion as grupo,
    cv.descripcion as clase,
    sv.descripcion as subclase,
    av.descripcion as articulo,
    sum(monto * expan) as monto,
    round(sum(monto * expan) / cast(gasto_total as real), 6) as porc_gasto
from
    gastos_consumo gc
    join divisiones_vw dv on gc.division = dv.CLAVE
    join grupos_vw gv on gc.grupo = gv.CLAVE
    join clases_vw cv on gc.clase = cv.CLAVE
    join subclases_vw sv on gc.subclase = sv.CLAVE
    join articulos_vw av on gc.articulo = av.CLAVE
    join (select
            sum(monto * expan) as gasto_total
        from
            gastos_consumo) t
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
    articulo