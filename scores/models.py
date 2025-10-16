from django.db import models

# Create your models here.
##Line-by-line explanation:
# models.Model → Base class for database tables.
# Each attribute (e.g. username, score) becomes a database column.
# auto_now_add automatically sets the current date/time when created.

class HighScore(models.Model):
    player_name = models.CharField(max_length=32)
    score = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.player_name}: {self.score}"
