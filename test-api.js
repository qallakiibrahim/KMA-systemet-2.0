import axios from 'axios';

axios.post('http://127.0.0.1:8000/api/tasks/', { title: 'Test', description: 'Test' })
  .then(res => console.log('Success:', res.status, res.data))
  .catch(err => console.error('Error:', err.response ? err.response.status + ' ' + JSON.stringify(err.response.data) : err.message));
