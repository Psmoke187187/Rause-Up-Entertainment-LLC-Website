// Vercel webhook template. Needs STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and an email provider key before it can send download links automatically.
export default async function handler(req,res){res.status(200).json({ok:true,message:'Webhook placeholder - delivery automation not configured yet'});}
