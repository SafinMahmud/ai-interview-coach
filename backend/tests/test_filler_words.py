from app.utils.filler_words import count_filler_words


def test_counts_common_fillers():
    text = "Um, I like, you know, basically led the team. Well, uh, it went well."
    assert count_filler_words(text) >= 5


def test_empty_transcript():
    assert count_filler_words("") == 0
