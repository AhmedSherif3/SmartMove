import sys

with open('app.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace Map center
text = text.replace('.setView([27.5, 30.8], 6);', '.setView([52.5, -1.5], 6);')

# Replace COLORS array
old_colors = """  const COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b',
    '#0ea5e9', '#f43f5e', '#10b981', '#f97316', '#a78bfa',
    '#fb7185', '#34d399',
  ];"""
new_colors = """  const COLORS = [
    '#dc2626', '#f59e0b', '#9f1239', '#fbbf24', '#ea580c',
    '#fca5a5', '#b45309', '#fef08a', '#7f1d1d', '#d97706',
    '#f87171', '#fef9c3',
  ];"""
text = text.replace(old_colors, new_colors)

text = text.replace('#6366f1', '#dc2626')
text = text.replace('rgba(99,102,241,', 'rgba(220,38,38,')

text = text.replace('#818cf8', '#ef4444')

text = text.replace('#14b8a6', '#f59e0b')
text = text.replace('rgba(20,184,166,', 'rgba(245,158,11,')

text = text.replace('#ec4899', '#9f1239')
text = text.replace('rgba(236,72,153,', 'rgba(159,18,57,')

text = text.replace('#8b5cf6', '#b45309')
text = text.replace('rgba(139,92,246,', 'rgba(180,83,9,')

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(text)

print('Done')
