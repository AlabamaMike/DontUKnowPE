module.exports = async function (context, req, connection) {
  // Return the connection info (URL + token) so the client can connect
  return {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: connection
  };
};
