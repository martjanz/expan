SELECT
    c.descrip AS division,
    g.descrip AS grupo,
    s.descrip AS subgrupo,
    sum(monto * expan) AS monto,
    round(sum(monto * expan) / cast(gasto_total AS REAL), 6) AS porcentaje
FROM
    gastos gc
    JOIN hogares h USING (clave)
    JOIN capitulos c USING (capitulo)
    JOIN grupos g USING (grupo)
    JOIN subgrupos s ON s.subgrupo = gc.subgrupo
    JOIN (SELECT
            sum(monto * expan) AS gasto_total
        FROM
            gastos
            JOIN hogares using (clave)) t
GROUP BY
    c.descrip,
    g.descrip,
    s.descrip