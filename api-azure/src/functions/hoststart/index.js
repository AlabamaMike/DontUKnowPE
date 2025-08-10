// No-op timer to warm the host and keep connections healthy in consumption
module.exports = async function (context, myTimer) {
  context.log('hoststart tick');
};
