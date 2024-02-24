const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const app = express()
app.use(express.json())

let db = null // Initialize db variable

const dbPath = path.join(__dirname, 'covid19India.db')

async function initializeDBandServer() {
  try {
    db = await open({filename: dbPath, driver: sqlite3.Database})
    app.listen(3000, () => {
      console.log(`The server is running at port 3000`)
    })
  } catch (err) {
    console.log(`DB.Error ${err.message}`)
    process.exit(1)
  }
}

initializeDBandServer()

// api1 all states
function stateLists(eachstate) {
  return {
    stateId: eachstate.state_id,
    stateName: eachstate.state_name,
    population: eachstate.population,
  }
}

app.get('/states/', async (req, res) => {
  const allStatesQuery = `SELECT * FROM state ORDER BY state_id`
  try {
    const stateList = await db.all(allStatesQuery)
    const dbResponse = stateList.map(each => stateLists(each))
    res.send(dbResponse)
  } catch (err) {
    console.error(`Error fetching states: ${err.message}`)
    res.status(500).send('Internal Server Error')
  }
})

// state id
app.get('/states/:stateId/', async (req, res) => {
  const {stateId} = req.params
  const stateDetails = req.body
  const getStateQuery = `SELECT * FROM state WHERE state_id=${stateId}`
  try {
    const dbResponse = await db.get(getStateQuery)
    res.send(dbResponse)
  } catch (err) {
    console.log(`Error in getting States: ${err.message}`)
    res.status(500).send('Internal Server Error')
  }
})

//post district
app.post('/districts/', async (req, res) => {
  const districtDetails = req.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  const districtQuery = `INSERT INTO district (district_name,state_id,cases,cured,active,deaths) VALUES (?, ?, ?, ?, ?, ?)`

  try {
    await db.run(districtQuery, [
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    ])
    res.send('District Successfully Added')
  } catch (err) {
    console.log(`Error in adding: ${err.message}`)
    res.status(500).send('Internal Server Error')
  }
})

// returns district based on district id

app.get('/districts/:districtId/', async (req, res) => {
  const {districtId} = req.params
  const getDistrictQuery = `SELECT * FROM district WHERE district_id=${districtId}`
  try {
    const districtDetails = await db.get(getDistrictQuery)
    if (!districtDetails) {
      return res.status(404).send('District not found')
    }
    const dbResponse = districtLists(districtDetails)
    res.send(dbResponse)
  } catch (err) {
    console.log(`Error in getting District: ${err.message}`)
    res.status(500).send('Internal Server Error')
  }
})

function districtLists(district) {
  return {
    districtId: district.district_id,
    districtName: district.district_name,
    stateId: district.state_id,
    cases: district.cases,
    cured: district.cured,
    active: district.active,
    deaths: district.deaths,
  }
}

// district remove

app.delete('/districts/:districtId/', async (req, res) => {
  const {districtId} = req.params
  const districtDeleteQuery = `SELECT * FROM district WHERE district_id=${districtId}`
  try {
    const dbResponse = await db.run(districtDeleteQuery)
    res.send('District Removed')
  } catch (err) {
    console.log(`Error in getting District: ${err.message}`)
    res.status(500).send('Internal Error')
  }
})

// update district

app.put('/districts/:districtId/', async (req, res) => {
  const {districtId} = req.params
  const districtDetails = req.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  const districtQuery = `
  UPDATE district
  SET district_id=?,district_name=?,state_id=?,cases=?,cured=?,active=?,deaths=? WHERE district_id=?`
  try {
    await db.run(districtQuery, [
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
      districtId,
    ])
    res.send('District Details Updated')
  } catch (err) {
    console.log(`Error in updating: ${err.message}`)
    res.status(500).send('Internal Error')
  }
})
// total
app.get('/states/:stateId/stats/', async (req, res) => {
  const {stateId} = req.params
  const totalQuery = `
    SELECT 
      SUM(cases) AS cases,
      SUM(cured) AS cured,
      SUM(active) AS active,
      SUM(deaths) AS deaths
    FROM district
    WHERE state_id = ${stateId}
  `

  try {
    const totalQueryList = await db.all(totalQuery)
    if (totalQueryList.length === 0) {
      return res.status(404).send('Stats not found for the state')
    }
    const dbResponse = totalcount(totalQueryList[0]) // Access the first element
    res.send(dbResponse)
  } catch (err) {
    console.log(`Error in counting: ${err.message}`)
    res.status(500).send('Internal Error')
  }
})

function totalcount(state) {
  return {
    totalCases: state.cases,
    totalCured: state.cured,
    totalActive: state.active,
    totalDeaths: state.deaths,
  }
}

// api 8 return statename

app.get('/districts/:districtId/details/', async (req, res) => {
  const {districtId} = req.params
  const stateNameQuery = `
    SELECT state_name AS stateName
    FROM state
    WHERE state_id = (
      SELECT state_id
      FROM district
      WHERE district_id = ${districtId}
    )
  `
  try {
    const dbResponse = await db.get(stateNameQuery)
    if (!dbResponse) {
      return res.status(404).send('District not found')
    }
    res.send(dbResponse)
  } catch (err) {
    console.error(`Error in district: ${err.message}`)
    res.status(500).send('Internal Error')
  }
})
/*app.get('/districts/:districtId/details/', async (req, res) => {
  const { districtId } = req.params;
  const getStateNameQuery = `
    SELECT state.state_name AS stateName
    FROM district
    INNER JOIN state ON district.state_id = state.state_id
    WHERE district.district_id = ${districtId}
  `;

  try {
    const result = await db.get(getStateNameQuery);
    if (!result) {
      return res.status(404).send('District not found');
    }
    res.send(result);
  } catch (err) {
    console.error(`Error in getting district details: ${err.message}`);
    res.status(500).send('Internal Server Error');
  }
});
*/
module.exports = app
