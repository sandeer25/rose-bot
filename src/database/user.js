const supabase = require('./supabase');
const { RELATIONSHIP_STATUS } = require('../config/constants');

async function ensureUser(userId, userName, firstName) {
  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!existingUser) {
      await supabase.from('users').insert({
        user_id: userId,
        username: userName,
        first_name: firstName,
        total_messages: 0,
        relationship_status: RELATIONSHIP_STATUS.STRANGER,
        sentiment_score: 0.0,
        positive_interactions: 0,
        negative_interactions: 0,
      });
      console.log(`New user: ${firstName} (${userId})`);
      return 'new';
    } else {
      await supabase
        .from('users')
        .update({ last_seen: new Date().toISOString() })
        .eq('user_id', userId);
      return 'existing';
    }
  } catch (error) {
    console.error('Error ensuring user:', error.message);
    return 'existing';
  }
}

async function getUserRelationshipStatus(userId) {
  try {
    const { data } = await supabase
      .from('users')
      .select('relationship_status, first_name, sentiment_score')
      .eq('user_id', userId)
      .single();
    
    return data || { relationship_status: RELATIONSHIP_STATUS.STRANGER, first_name: 'Unknown', sentiment_score: 0 };
  } catch (error) {
    return { relationship_status: RELATIONSHIP_STATUS.STRANGER, first_name: 'Unknown', sentiment_score: 0 };
  }
}

async function getAllBoyfriends() {
  try {
    const { data } = await supabase
      .from('users')
      .select('user_id, first_name')
      .eq('relationship_status', RELATIONSHIP_STATUS.BOYFRIEND);
    
    return data || [];
  } catch (error) {
    return [];
  }
}

async function recordInteraction(userId, interactionType, sentimentChange) {
  try {
    await supabase.rpc('record_interaction', {
      user_id_param: userId,
      interaction_type: interactionType,
      sentiment_change: sentimentChange,
    });
  } catch (error) {
    console.error('Error recording interaction:', error.message);
  }
}

async function saveSecret(userId, secretText, category = 'general') {
  try {
    await supabase.from('user_secrets').insert({
      user_id: userId,
      secret_text: secretText,
      category: category,
    });
  } catch (error) {
    console.error('Error saving secret:', error.message);
  }
}

async function getUserSecrets(userId) {
  try {
    const { data } = await supabase
      .from('user_secrets')
      .select('secret_text, category, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    return data || [];
  } catch (error) {
    return [];
  }
}

module.exports = {
  ensureUser,
  getUserRelationshipStatus,
  getAllBoyfriends,
  recordInteraction,
  saveSecret,
  getUserSecrets,
};