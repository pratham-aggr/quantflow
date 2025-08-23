import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

console.log('Testing Upstash Redis REST API...')
console.log('URL:', UPSTASH_REDIS_REST_URL)
console.log('Token:', UPSTASH_REDIS_REST_TOKEN ? 'Present' : 'Missing')

async function testUpstash() {
  try {
    // Test 1: Simple SET command
    console.log('\n1. Testing SET command...')
    const setResponse = await axios({
      method: 'POST',
      url: UPSTASH_REDIS_REST_URL,
      headers: {
        'Authorization': `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: {
        command: 'SET',
        args: ['test_key', 'test_value']
      }
    })
    console.log('SET Response:', setResponse.data)

    // Test 2: Simple GET command
    console.log('\n2. Testing GET command...')
    const getResponse = await axios({
      method: 'POST',
      url: UPSTASH_REDIS_REST_URL,
      headers: {
        'Authorization': `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: {
        command: 'GET',
        args: ['test_key']
      }
    })
    console.log('GET Response:', getResponse.data)

    // Test 3: SET with EX
    console.log('\n3. Testing SET with EX...')
    const setExResponse = await axios({
      method: 'POST',
      url: UPSTASH_REDIS_REST_URL,
      headers: {
        'Authorization': `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: {
        command: 'SET',
        args: ['test_key_ex', 'test_value_ex', 'EX', '60']
      }
    })
    console.log('SET EX Response:', setExResponse.data)

  } catch (error) {
    console.error('Error:', error.response?.data || error.message)
  }
}

testUpstash()







