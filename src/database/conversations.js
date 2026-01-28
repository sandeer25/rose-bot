const supabase = require("./supabase");
const {
  MAX_CONVERSATION_HISTORY,
  MAX_STORED_MESSAGES,
} = require("../config/constants");

async function getConversationHistory(userId) {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(MAX_CONVERSATION_HISTORY * 5);

    if (error) throw error;

    return (data || []).reverse();
  } catch (error) {
    console.error("Error fetching history:", error.message);
    return [];
  }
}

// Track last sync time
let lastSequenceSync = 0;
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

async function saveMessage(userId, role, content) {
  try {
    await supabase.from("conversations").insert({
      user_id: userId,
      role: role,
      content: content,
    });

    if (role === "user") {
      await supabase.rpc("increment_message_count", { user_id_param: userId });
    }

    // Sync sequences every 5 minutes during active usage
    const now = Date.now();
    if (now - lastSequenceSync > SYNC_INTERVAL) {
      lastSequenceSync = now;
      syncSequences(); // Run async without blocking
    }

    // Clean up old messages
    const { data: oldMessages } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(MAX_STORED_MESSAGES, 1000);

    if (oldMessages && oldMessages.length > 0) {
      const idsToDelete = oldMessages.map((msg) => msg.id);
      await supabase.from("conversations").delete().in("id", idsToDelete);
    }
  } catch (error) {
    console.error("Error saving message:", error.message);
  }
}

async function syncSequences() {
  try {
    await supabase.rpc("sync_all_sequences");
    console.log("✓ Database sequences synced");
  } catch (error) {
    console.error("Failed to sync sequences:", error.message);
  }
}

module.exports = {
  getConversationHistory,
  saveMessage,
  syncSequences,
};
