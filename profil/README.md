# Profilen · föreläsarens röst och preferenser

Agenten läser profilen innan den skriver text i ditt namn: rubriker, manus, beskrivningar och lästexter. Profilen är det som gör att föreläsningarna låter som du och inte som en agent.

| Fil | Innehåll |
|---|---|
| `rost.md` | Hur du låter: ton, öppningar, bryggor, landningar, ord du använder och ord du undviker. |
| `preferenser.md` | Det du vill ha i alla föreläsningar, skilt från beslut som bara gäller en viss föreläsning. |

**Filerna är mallar** med en påhittad föreläsare. Varje mall börjar med raden `> **MALL – inte ifylld.**`, och så länge den raden står kvar räknar agenten profilen som saknad: den följer inte exemplet utan frågar dig om tilltal och ton. Skriv om filerna med egna ord, eller be agenten intervjua dig och fylla i dem, och ta sedan bort MALL-raden i varje fil du har gjort till din. Agenten skriver bara i profilen när du säger ja.

Ett beslut som gäller en enda föreläsning hör inte hemma här utan i `planering/<slug>.md` eller i föreläsningens anteckningar.
