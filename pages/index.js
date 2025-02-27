/* wallet connection functionality */

import Head from 'next/head'
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Image from 'next/image';

export default function Home() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState(null);
  const [contractAddress, setContractAddress] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [balance, setBalance] = useState(0);
  const [tokenURI, setTokenURI] = useState('');
  const [tokenImage, setTokenImage] = useState('');
  const [recipientAddresses, setRecipientAddresses] = useState('');
  const [amountPerAddress, setAmountPerAddress] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const signer = provider.getSigner();
        const account = await signer.getAddress();
        const { chainId } = await provider.getNetwork();
        
        setProvider(provider);
        setSigner(signer);
        setAccount(account);
        setChainId(chainId);
      } else {
        alert('Please install Rabby Wallet extension');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAccount('');
    setChainId(null);
    setContractAddress('');
    setTokenId('');
    setBalance(0);
    setTokenURI('');
    setTokenImage('');
  };
  
 /* check NFT balance and metadata */
  const ERC1155_ABI = [
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function uri(uint256 id) view returns (string)',
  'function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data)'
];

const checkNFTBalance = async () => {
  if (!signer || !contractAddress || !tokenId) return;
  
  try {
    setIsLoading(true);
    const contract = new ethers.Contract(contractAddress, ERC1155_ABI, signer);
    const balance = await contract.balanceOf(account, tokenId);
    setBalance(balance.toString());
    
    try {
      const uri = await contract.uri(tokenId);
      setTokenURI(uri);
      
      // Handle IPFS or HTTP URIs
      let metadataUrl = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
      metadataUrl = metadataUrl.replace('{id}', ethers.utils.hexZeroPad(ethers.BigNumber.from(tokenId).toHexString(), 32).slice(2));
      
      const response = await fetch(metadataUrl);
      const metadata = await response.json();
      
      if (metadata.image) {
        let imageUrl = metadata.image;
        if (imageUrl.startsWith('ipfs://')) {
          imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
        }
        setTokenImage(imageUrl);
      }
    } catch (error) {
      console.error('Error fetching token URI:', error);
    }
  } catch (error) {
    console.error('Error checking NFT balance:', error);
    alert('Error checking NFT balance. Make sure the contract address and token ID are valid.');
  } finally {
    setIsLoading(false);
  }
};

  /* implement the bulk transfer functionality */
  const sendTokens = async () => {
  if (!signer || !contractAddress || !tokenId || !recipientAddresses.trim()) return;
  
  const addresses = recipientAddresses.split('\n').map(addr => addr.trim()).filter(addr => addr);
  
  if (addresses.length === 0) {
    alert('Please provide at least one recipient address');
    return;
  }
  
  const totalAmount = addresses.length * amountPerAddress;
  
  if (totalAmount > parseInt(balance)) {
    alert(`Not enough tokens. You have ${balance} tokens but trying to send ${totalAmount}`);
    return;
  }
  
  try {
    setIsLoading(true);
    const contract = new ethers.Contract(contractAddress, ERC1155_ABI, signer);
    
    // Process transfers in batches to avoid gas issues
    const batchSize = 50;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const txPromises = batch.map(to => {
        return contract.safeBatchTransferFrom(
          account,
          to,
          [tokenId],
          [amountPerAddress],
          '0x'
        );
      });
      
      await Promise.all(txPromises.map(tx => tx.wait()));
    }
    
    alert('Tokens sent successfully!');
    checkNFTBalance(); // Refresh balance
  } catch (error) {
    console.error('Error sending tokens:', error);
    alert('Error sending tokens. Check console for details.');
  } finally {
    setIsLoading(false);
  }
};

  /* UI with the light blue background */
  return (
  <div className="min-h-screen p-8" style={{ backgroundColor: '#e6f2ff' }}>
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">NFT BULK TRANSER by Scarab</h1>
      
      <div className="flex justify-between mb-6">
        {!account ? (
          <button 
            onClick={connectWallet}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          >
            Connect Wallet
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <span className="font-medium">
              {account.substring(0, 6)}...{account.substring(account.length - 4)}
            </span>
            <button 
              onClick={disconnectWallet}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
            >
              Disconnect Wallet
            </button>
          </div>
        )}
        
        <div>
          <span className="font-medium">
            Network: {chainId === 137 ? 'Polygon' : chainId === 8453 ? 'Base' : 'Unsupported Network'}
          </span>
        </div>
      </div>
      
      {account && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NFT Contract Address
              </label>
              <input
                type="text"
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                placeholder="0x..."
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Token ID
              </label>
              <input
                type="number"
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
                placeholder="0"
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
          </div>
          
          <div className="flex justify-center mb-6">
            <button
              onClick={checkNFTBalance}
              disabled={!contractAddress || !tokenId || isLoading}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Check NFT Balance'}
            </button>
          </div>
          
          {balance > 0 && (
            <div className="mb-6">
              <div className="p-4 bg-gray-100 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Available Balance: {balance} tokens</h2>
                  
                  <a
                    href={`https://opensea.io/assets/matic/${contractAddress}/${tokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                  >
                    View on OpenSea
                  </a>
                </div>
                
                {tokenImage && (
                  <div className="flex justify-center mb-4">
                    <div className="w-48 h-48 relative">
                      <Image
                        src={tokenImage}
                        alt="NFT"
                        layout="fill"
                        objectFit="contain"
                        className="rounded"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Addresses (one per line)
                </label>
                <textarea
                  value={recipientAddresses}
                  onChange={(e) => setRecipientAddresses(e.target.value)}
                  placeholder="0x..."
                  rows={10}
                  className="w-full p-2 border border-gray-300 rounded font-mono"
                  style={{ whiteSpace: 'nowrap', overflowX: 'auto' }}
                />
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Per Address
                </label>
                <input
                  type="number"
                  value={amountPerAddress}
                  onChange={(e) => setAmountPerAddress(parseInt(e.target.value) || 1)}
                  min="1"
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              
              <div className="mt-6 flex justify-center">
                <button
                  onClick={sendTokens}
                  disabled={
                    isLoading || 
                    !recipientAddresses.trim() || 
                    amountPerAddress <= 0 ||
                    recipientAddresses.split('\n').filter(addr => addr.trim()).length * amountPerAddress > balance
                  }
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg text-lg disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : 'Send Tokens'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  </div>
);

  // Rest of the component...
}



// import Head from 'next/head'
// import Header from '@components/Header'
// import Footer from '@components/Footer'

// export default function Home() {
//   return (
//     <div className="container">
//       <Head>
//         <title>Next.js Starter!</title>
//         <link rel="icon" href="/favicon.ico" />
//       </Head>

//       <main>
//         <Header title="Welcome to my app!" />
//         <p className="description">
//           Get started by editing <code>pages/index.js</code>
//         </p>
//       </main>
// 
//       <Footer />
//     </div>
//   )
// } 
