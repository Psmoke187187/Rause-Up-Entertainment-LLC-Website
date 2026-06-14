// Vercel/Node template for automated digital delivery after Stripe payment.
// This does not run on GitHub Pages. Deploy to Vercel or another Node host.
// Required env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL,
// PROJECT_K_BASIC_DOWNLOAD_URL, PROJECT_K_PREMIUM_DOWNLOAD_URL, PROJECT_K_EXCLUSIVE_DOWNLOAD_URL

const Stripe = require('stripe');
const nodemailer = require('nodemailer');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_details?.email || session.customer_email;
    const license = session.metadata?.license || 'basic';
    const beatId = session.metadata?.beat_id || 'project-k';
    if (email && beatId === 'project-k') {
      const url = license === 'premium' ? process.env.PROJECT_K_PREMIUM_DOWNLOAD_URL : license === 'exclusive' ? process.env.PROJECT_K_EXCLUSIVE_DOWNLOAD_URL : process.env.PROJECT_K_BASIC_DOWNLOAD_URL;
      await sendEmail(email, license, url);
    }
  }
  res.json({ received: true });
};

async function sendEmail(to, license, downloadUrl) {
  const transporter = nodemailer.createTransport({host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: false, auth: {user: process.env.SMTP_USER, pass: process.env.SMTP_PASS}});
  await transporter.sendMail({from: process.env.FROM_EMAIL || process.env.SMTP_USER, to, subject: `Your Project K ${license} download`, text: `Thank you for your purchase. Download your files here: ${downloadUrl}\n\nSupport: raiseupent.ru@gmail.com`, html: `<h2>Thank you for your purchase.</h2><p>Your Project K ${license} files are ready.</p><p><a href="${downloadUrl}">Download your files</a></p><p>Support: raiseupent.ru@gmail.com</p>`});
}
