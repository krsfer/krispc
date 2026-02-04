"""
Unit tests for the pattern generator module.
"""
from django.test import TestCase
from emoty.pattern_generator import PatternGenerator


class PatternGeneratorTests(TestCase):
    """Test cases for PatternGenerator class."""
    
    def test_single_emoji_pattern(self):
        """Test pattern generation with a single emoji."""
        sequence = ["🐋"]
        grid = PatternGenerator.generate_concentric_pattern(sequence)
        
        self.assertEqual(len(grid), 1)
        self.assertEqual(len(grid[0]), 1)
        self.assertEqual(grid[0][0], "🐋")
    
    def test_two_emoji_pattern(self):
        """Test pattern generation with two emojis."""
        sequence = ["🐋", "🐳"]
        grid = PatternGenerator.generate_concentric_pattern(sequence)
        
        # Grid size should be (2 * 2) - 1 = 3
        self.assertEqual(len(grid), 3)
        self.assertEqual(len(grid[0]), 3)
        
        # Center should be first emoji
        self.assertEqual(grid[1][1], "🐋")
        
        # Outer layer should be second emoji
        self.assertEqual(grid[0][0], "🐳")
        self.assertEqual(grid[0][2], "🐳")
        self.assertEqual(grid[2][0], "🐳")
        self.assertEqual(grid[2][2], "🐳")
    
    def test_three_emoji_pattern(self):
        """Test pattern generation with three emojis (example from docs)."""
        sequence = ["🐋", "🐳", "🏵️"]
        grid = PatternGenerator.generate_concentric_pattern(sequence)
        
        # Grid size should be (3 * 2) - 1 = 5
        self.assertEqual(len(grid), 5)
        self.assertEqual(len(grid[0]), 5)
        
        # Center should be first emoji
        self.assertEqual(grid[2][2], "🐋")
        
        # First layer should be second emoji
        self.assertEqual(grid[1][1], "🐳")
        self.assertEqual(grid[1][3], "🐳")
        
        # Outer layer should be third emoji
        self.assertEqual(grid[0][0], "🏵️")
        self.assertEqual(grid[0][4], "🏵️")
        self.assertEqual(grid[4][0], "🏵️")
        self.assertEqual(grid[4][4], "🏵️")
    
    def test_empty_sequence(self):
        """Test that empty sequence returns empty grid."""
        sequence = []
        grid = PatternGenerator.generate_concentric_pattern(sequence)
        
        self.assertEqual(grid, [])
    
    def test_format_grid_as_text(self):
        """Test grid to text conversion."""
        grid = [
            ["🏵️", "🏵️", "🏵️"],
            ["🏵️", "🐋", "🏵️"],
            ["🏵️", "🏵️", "🏵️"]
        ]
        
        text = PatternGenerator.format_grid_as_text(grid)
        expected = "🏵️🏵️🏵️\n🏵️🐋🏵️\n🏵️🏵️🏵️"
        
        self.assertEqual(text, expected)
    
    def test_validate_emoji_sequence_valid(self):
        """Test validation of valid emoji sequences."""
        # Single emoji
        sequence = PatternGenerator.validate_emoji_sequence("🐋")
        self.assertEqual(len(sequence), 1)
        self.assertEqual(sequence[0], "🐋")
        
        # Multiple emojis
        sequence = PatternGenerator.validate_emoji_sequence("🐋🐳🏵️")
        self.assertEqual(len(sequence), 3)
        self.assertIn("🐋", sequence)
        self.assertIn("🐳", sequence)
    
    def test_validate_emoji_sequence_empty(self):
        """Test validation rejects empty sequences."""
        with self.assertRaises(ValueError) as context:
            PatternGenerator.validate_emoji_sequence("")
        
        self.assertIn("cannot be empty", str(context.exception))
    
    def test_validate_emoji_sequence_too_long(self):
        """Test validation rejects sequences that are too long."""
        # Create a sequence with 11 emojis (max is 10)
        long_sequence = "🐋" * 11
        
        with self.assertRaises(ValueError) as context:
            PatternGenerator.validate_emoji_sequence(long_sequence)
        
        self.assertIn("too long", str(context.exception).lower())
    
    def test_validate_emoji_sequence_invalid_chars(self):
        """Test validation rejects non-emoji characters."""
        with self.assertRaises(ValueError) as context:
            PatternGenerator.validate_emoji_sequence("abc123")
        
        self.assertIn("No valid emojis", str(context.exception))
    
    def test_is_valid_emoji(self):
        """Test individual emoji validation."""
        # Valid emojis
        self.assertTrue(PatternGenerator.is_valid_emoji("🐋"))
        self.assertTrue(PatternGenerator.is_valid_emoji("🐳"))
        self.assertTrue(PatternGenerator.is_valid_emoji("🏵️"))
        self.assertTrue(PatternGenerator.is_valid_emoji("❤️"))
        
        # Invalid inputs
        self.assertFalse(PatternGenerator.is_valid_emoji(""))
        self.assertFalse(PatternGenerator.is_valid_emoji("a"))
        self.assertFalse(PatternGenerator.is_valid_emoji("123"))
    
    def test_max_sequence_length(self):
        """Test pattern generation with maximum allowed emojis."""
        sequence = ["🐋"] * 10  # Max is 10
        grid = PatternGenerator.generate_concentric_pattern(sequence)
        
        # Grid size should be (10 * 2) - 1 = 19
        self.assertEqual(len(grid), 19)
        self.assertEqual(len(grid[0]), 19)
    
    def test_pattern_symmetry(self):
        """Test that generated patterns are symmetric."""
        sequence = ["🐋", "🐳", "🏵️"]
        grid = PatternGenerator.generate_concentric_pattern(sequence)
        
        size = len(grid)
        
        # Check horizontal symmetry
        for i in range(size):
            for j in range(size // 2):
                self.assertEqual(grid[i][j], grid[i][size - 1 - j])
        
        # Check vertical symmetry
        for i in range(size // 2):
            for j in range(size):
                self.assertEqual(grid[i][j], grid[size - 1 - i][j])
