import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Category from './components/Category';
import Transaction from './components/Transaction';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [requestId, setRequestId] = useState('');
  const [userIDs, setUsers] = useState([])
  const [userName, setUserName] = useState('');

  const fetchUsers = async () => {
    try {
      const response = await axios.post('/api/users');
      
      const users = response.data.result.Items;
      const tempUserIDs = users.map(user => user.Id);

      setUsers(tempUserIDs);

    } catch (error) {
      console.error('Error fetching users', error);
    }
  };

  const fetchTransactions = async (userIDs) => {
    try {
      if (userIDs.length === 0) {
        console.warn('No user IDs available to fetch transactions');
        return;
      }  
      const response = await axios.post('/api/transactions', userIDs);
      
      // Combine all transactions into a single list
      const allTransactions = response.data.transactions.flatMap(user => user.userTransactions);

      setTransactions(allTransactions);
      
    } catch (error) {
        console.error('Error fetching transactions', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      console.log("Retrieving users...");
      await fetchUsers();

      console.log("The following users were found: ", userIDs);

      if (userIDs.length > 0) {
        await fetchTransactions(userIDs);
      }
    }; 

    fetchData();
  }, []);  // Empty array ensures this runs only once when the component mounts


  return (
    <div className="App">
      {transactions.map((transaction) => (
        <Transaction key={transaction.Id} transactionId={transaction.Id} amount={transaction.Amount} />
      ))}
      <h1>Points Earned for {userName}</h1>
      <h2>Points earned in 2024 to date</h2>
      <Category  />
    </div>
  );
}

export default App;
