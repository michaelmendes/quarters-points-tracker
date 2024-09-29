const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT;
const ZUMRAILS_BASE_URL = process.env.ZUMRAILS_BASE_URL;
let accessToken = process.env.TOKEN;

// Response interceptor to handle 401 errors and refresh token
axios.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;
      
      if (error.response && error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;  // To prevent an infinite loop
        
        // Refresh token logic
        const newAccessToken = await getNewAccessToken();
        
        if (newAccessToken) {
            accessToken = newAccessToken; 
            
            // Retry the original request with the new access token
            axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            
            return axios(originalRequest);  // Retry the request with updated token
        }
      }
      
      return Promise.reject(error);
    }
);

// Function to refresh the access token 
async function getNewAccessToken() {
    try {
        // Replace these with actual values from your environment variables
        const username = process.env.API_USERNAME; 
        const password = process.env.API_PASSWORD;

        const response = await axios.post(
            `${ZUMRAILS_BASE_URL}/api/authorize`, {
                "Username": username,
                "Password": password
        });

        // Check if the response is successful and contains the token
        if (response.data.statusCode === 200 && !response.data.isError) {
            const newAccessToken = response.data.result.Token;
            const newRefreshToken = response.data.result.RefreshToken;

            console.log('New Access Token:', newAccessToken);
            console.log('New Refresh Token:', newRefreshToken);

            // Use the new token in your future API requests
            return newAccessToken;
        } else {
            console.error('Failed to get a new access token:', response.data.message);
            return null;
        }
    } catch (error) {
        console.error('Error fetching new access token:', error.message);
        return null;
    }
}

async function ensureValidAccessToken() {
    if (!accessToken) {
        console.log('Access token missing. Fetching new token...');
        const newToken = await getNewAccessToken();
        if (newToken) {
            accessToken = newToken;  // Update the in-memory access token
        } else {
            throw new Error('Unable to refresh access token.');
        }
    }
    return accessToken;
}
  

// get all userIDs
app.post('/api/users', async (req, res) => {
    try {
        await ensureValidAccessToken();
        
        const response = await axios.post(
            `${ZUMRAILS_BASE_URL}/api/user/filter`,{},
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );
  
        if (response.data.statusCode === 200 && response.data.result.Items) {
            // Extract user IDs from the Items array
            const userIDs = response.data.result.Items.map(user => user.Id);
      
            // Send the list of user IDs back to the client
            return res.status(200).json(userIDs);
        } else {
            return res.status(404).json({ message: 'No users found' });
        }
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error while fetching users data' });
    }
});


// get all the transactions in the ID list
app.post('/api/transactions', async (req, res) => {
    const userIDs = req.body;  // Expect an array of userIDs from the frontend
    
    if (!userIDs || !Array.isArray(userIDs)) {
      return res.status(400).json({ message: 'userIDs must be an array' });
    }
  
    try {
        // Use Promise.all to fetch transactions for all users concurrently
        await ensureValidAccessToken();    

        const allTransactions = await Promise.all(
            userIDs.map(async (userID) => {
                try {
                    const response = await axios.post(
                        `${ZUMRAILS_BASE_URL}/api/transaction/filter`, {
                            "UserId": userID
                        }, 
                        {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    });
    
                    return {
                        userID,  // Include userID for reference in the result
                        userTransactions: response.data.result.Items,  // Add the fetched transactions
                    };
                } catch (error) {
                    console.error(`Error fetching transactions for user ${userID}:`, error.message);            
                    return { userID, userTransactions: [], error: error.message };
                }
            })
        );  
        // Return the combined transactions for all users
        res.status(200).json({ transactions: allTransactions });
        
    } catch (error) {
      console.error('Error fetching transactions for multiple customers:', error);
      res.status(500).json({ message: 'Server error while fetching transactions for multiple customers' });
    }
});


// get aggregated information using RequestId
app.get('/api/aggregation/:requestId', async (req, res) => {
    const { requestId } = req.params;
  
    try {
      const response = await axios.get(
        `${ZUMRAILS_BASE_URL}/api/aggregation/GetInformationByRequestId/${requestId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );
  
      res.status(200).json(response.data.result);
    } catch (error) {
      console.error('Error fetching aggregation:', error);
      res.status(500).json({ message: 'Server error while fetching aggregated data' });
    }
  });


// retrieve the details of a given transaction 
app.get('/api/transaction/:transaction_id', async (req, res) => {
    const trans_id = req.params.transaction_id;

    try {
        const response  = await axios.get(`${ZUMRAILS_BASE_URL}/api/transaction/${trans_id}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            }
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching transaction data:', error);
        res.status(500).send('Server error');
    }
})

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
