import React, { useState } from 'react';

const Transaction = ({ transactionId, amount }) => {
    return (
        <div>
            <h3>Transaction ID: {transactionId}</h3>
            <p>Amount: {amount}</p>
        </div>
    );
};

export default Transaction;