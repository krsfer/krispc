"""
Pattern generation engine for Emoty.
Generates concentric square emoji patterns from emoji sequences.

Ported from TypeScript implementation in emoty_web/src/lib/utils/pattern-generator.ts
"""
import re
from typing import List, Optional


class PatternGenerator:
    """Generates concentric square emoji patterns from emoji sequences."""
    
    MAX_SEQUENCE_LENGTH = 10
    
    @staticmethod
    def generate_concentric_pattern(sequence: List[str]) -> List[List[str]]:
        """
        Generates a concentric square pattern from an emoji sequence.
        
        In concentric patterns:
        - First emoji becomes the center
        - Each subsequent emoji wraps around as an outer layer
        - Creates symmetric square pattern
        
        Args:
            sequence: List of emoji strings from center to outer layers
            
        Returns:
            2D grid representing the pattern
            
        Example:
            Input: ["🐋", "🐳", "🏵️"]
            Output: [
                ["🏵️", "🏵️", "🏵️", "🏵️", "🏵️"],
                ["🏵️", "🐳", "🐳", "🐳", "🏵️"],
                ["🏵️", "🐳", "🐋", "🐳", "🏵️"],
                ["🏵️", "🐳", "🐳", "🐳", "🏵️"],
                ["🏵️", "🏵️", "🏵️", "🏵️", "🏵️"]
            ]
        """
        if not sequence:
            return []
        
        size = (len(sequence) * 2) - 1
        # Initialize grid with empty strings
        pattern = [["" for _ in range(size)] for _ in range(size)]
        
        center = size // 2
        
        # Fill layers from center outward
        for index, emoji in enumerate(sequence):
            distance = index  # index 0 = center, index 1 = first layer, etc.
            PatternGenerator._fill_square_layer(pattern, center, distance, emoji)
        
        return pattern
    
    @staticmethod
    def _fill_square_layer(
        pattern: List[List[str]], 
        center: int, 
        distance: int, 
        emoji: str
    ) -> None:
        """
        Fills a square layer in the pattern.
        
        Args:
            pattern: The pattern grid to modify
            center: Center coordinate
            distance: Distance from center (0 = center, 1 = first layer, etc.)
            emoji: Emoji to place in this layer
        """
        for i in range(center - distance, center + distance + 1):
            for j in range(center - distance, center + distance + 1):
                # Only place emoji on the perimeter of the current layer
                if (i == center - distance or i == center + distance or 
                    j == center - distance or j == center + distance):
                    pattern[i][j] = emoji
    
    @staticmethod
    def format_grid_as_text(grid: List[List[str]]) -> str:
        """
        Converts a 2D emoji grid to a text string with newline separators.
        
        Args:
            grid: 2D list of emoji strings
            
        Returns:
            String with rows separated by newlines
            
        Example:
            Input: [["🏵️", "🏵️"], ["🏵️", "🏵️"]]
            Output: "🏵️🏵️\n🏵️🏵️"
        """
        return "\n".join("".join(row) for row in grid)
    
    @staticmethod
    def validate_emoji_sequence(emojis: str) -> List[str]:
        """
        Validates and parses an emoji string into a sequence.
        
        Args:
            emojis: String containing emojis (e.g., "🐋🐳🏵️")
            
        Returns:
            List of individual emoji strings
            
        Raises:
            ValueError: If the sequence is invalid
        """
        if not emojis:
            raise ValueError("Emoji sequence cannot be empty")
        
        # Extract individual emojis using regex
        # This pattern matches emoji characters including those with modifiers
        emoji_pattern = re.compile(
            r'[\U0001F300-\U0001F9FF]|'  # Emoticons & Symbols
            r'[\U0001FA00-\U0001FAFF]|'  # Extended Symbols
            r'[\U00002600-\U000027BF]|'  # Misc Symbols
            r'[\U0001F600-\U0001F64F]|'  # Emoticons
            r'[\U0001F680-\U0001F6FF]|'  # Transport & Map
            r'[\U0001F1E0-\U0001F1FF]|'  # Flags
            r'[\U00002700-\U000027BF]|'  # Dingbats
            r'[\U0001F900-\U0001F9FF]|'  # Supplemental Symbols
            r'[\U0001F018-\U0001F270]|'  # Various symbols
            r'[\U0001F300-\U0001F5FF]'   # Misc Symbols and Pictographs
        )
        
        sequence = emoji_pattern.findall(emojis)
        
        if not sequence:
            raise ValueError("No valid emojis found in input")
        
        if len(sequence) > PatternGenerator.MAX_SEQUENCE_LENGTH:
            raise ValueError(
                f"Sequence too long. Maximum {PatternGenerator.MAX_SEQUENCE_LENGTH} emojis allowed, "
                f"got {len(sequence)}"
            )
        
        # Validate each emoji
        for emoji in sequence:
            if not PatternGenerator.is_valid_emoji(emoji):
                raise ValueError(f"Invalid emoji: {emoji}")
        
        return sequence
    
    @staticmethod
    def is_valid_emoji(char: str) -> bool:
        """
        Checks if a string is a valid emoji.
        
        Args:
            char: String to check
            
        Returns:
            True if valid emoji, False otherwise
        """
        if not char or len(char) > 8:
            return False
        
        # Check if string contains emoji characters
        emoji_pattern = re.compile(
            r'[\U0001F300-\U0001F9FF]|'
            r'[\U0001FA00-\U0001FAFF]|'
            r'[\U00002600-\U000027BF]|'
            r'[\U0001F600-\U0001F64F]|'
            r'[\U0001F680-\U0001F6FF]|'
            r'[\U0001F1E0-\U0001F1FF]|'
            r'[\U00002700-\U000027BF]|'
            r'[\U0001F900-\U0001F9FF]|'
            r'[\U0001F018-\U0001F270]|'
            r'[\U0001F300-\U0001F5FF]'
        )
        
        return bool(emoji_pattern.search(char))
