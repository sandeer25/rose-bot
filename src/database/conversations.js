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

module.exports = {
  getConversationHistory,
  saveMessage,
};
