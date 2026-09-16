<?php

namespace App\Services;

class AiAssistantService
{
    /**
     * Process message text through AI assistant rules and transformations.
     */
    public function process(string $action, string $text, array $options = []): string
    {
        $text = trim($text);
        if (empty($text)) {
            return '';
        }

        switch ($action) {
            case 'improve':
                return "🌟 " . ucfirst($text) . "\n\nWe are here to help you succeed! Feel free to ask any questions.";

            case 'shorten':
                $sentences = preg_split('/(?<=[.?!])\s+/', $text, -1, PREG_SPLIT_NO_EMPTY);
                if (count($sentences) > 1) {
                    return $sentences[0];
                }
                return substr($text, 0, 120) . (strlen($text) > 120 ? '...' : '');

            case 'expand':
                return $text . "\n\n✨ Why our community loves this:\n• Instant 24/7 automated support\n• Exclusive insider updates & offers\n• Direct access to personal assistance whenever you need it.";

            case 'tone_professional':
                return "Dear valued partner,\n\n" . rtrim($text, '.') . ".\n\nPlease let us know if you require any further information or assistance.\n\nBest regards,\nThe Telegram Automation Team";

            case 'tone_friendly':
                return "Hey there! 😊 " . rtrim($text, '.') . "! Hope you're having an awesome day. Let me know if you need anything at all! 🙌";

            case 'tone_sales':
                return "🔥 Don't miss out! " . $text . "\n\n⚡ Act fast — tap the button below to claim your special offer before it expires! 🚀";

            case 'tone_support':
                return "Hello! 👋 Thank you for reaching out to our support team.\n\n" . $text . "\n\nOur team is actively monitoring your request. We're here for you!";

            case 'bangla_to_english':
                // Common transliterations and translations
                $map = [
                    'হ্যালো' => 'Hello',
                    'কেমন আছেন' => 'How are you?',
                    'ধন্যবাদ' => 'Thank you very much',
                    'সাহায্য' => 'help',
                    'অফার' => 'exclusive offer',
                    'দয়া করে' => 'please',
                    'যোগাযোগ' => 'contact',
                ];
                $translated = str_replace(array_keys($map), array_values($map), $text);
                if ($translated === $text) {
                    return "Hello! Regarding your inquiry: " . $text . " (Translated to English: Please let us know how we can assist you today!)";
                }
                return $translated;

            case 'english_to_bangla':
                $map = [
                    'hello' => 'হ্যালো',
                    'hi' => 'হ্যালো',
                    'thank you' => 'ধন্যবাদ',
                    'thanks' => 'ধন্যবাদ',
                    'welcome' => 'স্বাগতম',
                    'help' => 'সাহায্য',
                    'support' => 'সহায়তা',
                    'friend' => 'বন্ধু',
                ];
                $translated = str_ireplace(array_keys($map), array_values($map), $text);
                if ($translated !== $text) {
                    return $translated . " (বাংলা অনুবাদ)";
                }
                return "হ্যালো! আপনার বার্তার জন্য ধন্যবাদ: " . $text;

            case 'emoji_suggestion':
                $emojis = [" ✨", " 🚀", " 💬", " 🎯", " 💡", " ✅"];
                return $text . $emojis[array_rand($emojis)];

            case 'grammar_fix':
                $fixed = ucfirst(preg_replace('/\s+/', ' ', $text));
                if (!preg_match('/[.!?]$/', $fixed)) {
                    $fixed .= '.';
                }
                return $fixed;

            case 'translate':
                $targetLang = $options['target_lang'] ?? 'English';
                return "[$targetLang] " . $text;

            default:
                return $text;
        }
    }
}
