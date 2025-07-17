const twilio = require('twilio');
exports.handler = async function(event) {
  const { mobile, name, trackingId } = JSON.parse(event.body);
  const accountSid = process.env.TWILIO_SID;
  const authToken = process.env.TWILIO_TOKEN;
  const twilioNumber = process.env.TWILIO_NUMBER;
  const client = twilio(accountSid, authToken);

  const msg = `Dear ${name}, your Thane Police tracking ID is ${trackingId}.`;
  try {
    await client.messages.create({
      to: `+91${mobile}`,
      from: twilioNumber,
      body: msg,
    });
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
