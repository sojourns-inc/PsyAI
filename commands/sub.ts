import Discord from 'discord.js';
import { SlashCommandBuilder } from "@discordjs/builders";
import { createClient } from '@supabase/supabase-js';
import stripeLib from 'stripe';

// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_KEY = process.env.SUPABASE_KEY as string;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Initialize Stripe client
const STRIPE_API_KEY = process.env.STRIPE_API_KEY as string;
const stripe = new stripeLib(STRIPE_API_KEY, { typescript: true, apiVersion: '2023-08-16' });

async function startSubscription(discordUserId: string): Promise<string> {
  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price: process.env.STRIPE_PLAN_ID as string,
        quantity: 1,
      },
    ],
    mode: "subscription",
    metadata: { discord_id: discordUserId },
    success_url: "https://psyai-patreon-linker-97bd2997eae8.herokuapp.com/success",
    cancel_url: "https://psyai-patreon-linker-97bd2997eae8.herokuapp.com/cancel",
  });

  return checkoutSession.url;
}

async function createUserAssociation(discordUserId: string) {
  try {
    const { data, error } = await supabase
      .from('user_association')
      .upsert([{ discord_id: discordUserId, subscription_status: false, stripe_id: "placeholder", trial_prompts: 5 }]);

    if (error) {
      console.error(error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error creating user association: ${error}`);
    return null;
  }
}

async function getUserAssociation(discordUserId: string) {
  try {
    const { data, error } = await supabase
      .from('user_association')
      .select('*')
      .eq('discord_id', discordUserId)
      .single();

    if (!data) {
      return await createUserAssociation(discordUserId);
    }

    if (error) {
      console.error(error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error fetching user association: ${error}`);
    return null;
  }
}

export const applicationCommandData: Discord.ApplicationCommandData = new SlashCommandBuilder()
  .setName("sub")
  .setDescription("Subscribe to get unlimited prompts for 1 YEAR")
  .toJSON() as unknown as Discord.ApplicationCommandData;;

export async function performInteraction(interaction: Discord.CommandInteraction) {
  try {
    const discordUserId = interaction.user.id;
    const user_association = await getUserAssociation(discordUserId);

    if (!user_association) {
      await interaction.reply("Sorry, something went wrong. Please try again later.");
      return;
    }

    if (user_association.subscription_status) {
      await interaction.reply("You're already subscribed! Thank you for your support.");
      return;
    }

    const paymentUrl = await startSubscription(discordUserId);
    await interaction.user.send(`Hi there, friend!\n\nThank you for choosing to support the devs of PsyAI, for only $12.40 per YEAR!  ૮₍ ˶ᵔ ᵕᵔ˶₎ა  >[Subscribe Now](${paymentUrl})<`);
  } catch (error) {
    console.error(`Error in performInteraction: ${error}`);
    await interaction.editReply("Sorry, something went wrong. Please try again later.");
  }
}
