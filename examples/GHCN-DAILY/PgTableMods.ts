export type SqlStmtType = {
    sql: string,
    stmt: string
}
export let tableMods: Map<string,SqlStmtType> = new Map<string,SqlStmtType>()

tableMods.set( 'air_by_station_by_month', {   
            sql:  'Materialized View',
            stmt: `CREATE MATERIALIZED VIEW air_by_station_by_month AS 
                    select station, EXTRACT(YEAR from mdate) as _year, EXTRACT(MONTH from mdate) as _month, avg(tmax) / 10 as _tmax, avg(tmin) / 10 as _tmin 
                    from air
                    group by station, EXTRACT(YEAR from mdate), EXTRACT(MONTH from mdate)`
            })
tableMods.set( 'air_FK_Stations_idx', { sql:  'Index', stmt: `CREATE INDEX air_FK_Stations_idx ON Air USING brin(Station)` })
tableMods.set( 'rain_FK_Stations_idx', { sql:  'Index', stmt: `CREATE INDEX rain_FK_Stations_idx ON Rain USING brin(Station)` })
tableMods.set( 'snow_FK_Stations_idx', { sql:  'Index', stmt: `CREATE INDEX snow_FK_Stations_idx ON Snow USING brin (Station)` })


// tableMods.set('air_by_station_by_month_refresh', `REFRESH MATERIALIZED VIEW ad_clicks_report`)
