SELECT DISTINCT
       date_trunc('minute', "ended") AS minute
     , count(*) OVER (ORDER BY date_trunc('minute', "ended")) AS running_ct
FROM   load_list
WHERE ended IS NOT NULL
ORDER  BY 1
