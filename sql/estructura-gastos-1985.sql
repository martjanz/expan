SELECT
    c.cdscrpcn AS division,
    g.cdscrpcn AS grupo,
	a.cdscrpcn AS articulo,
    sum(monto * expan) AS monto,
    round(sum(monto * expan) / cast(gasto_total AS REAL), 6) AS porcentaje
FROM
    gastos gc
    JOIN hogares h USING (cclave)
	JOIN articulos a USING (ccdgartcl)
    JOIN grupos g USING (ccdggrp)
	JOIN capitulos c USING (ccdgcptl)
    JOIN (SELECT
            sum(monto * expan) AS gasto_total
        FROM
            gastos
            JOIN hogares using (cclave)) t
GROUP BY
    c.ccdgcptl,
    g.ccdggrp,
	a.ccdgartcl