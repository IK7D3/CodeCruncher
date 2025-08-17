n, k = map(int, input().split())
visited = [False] * n
count = 0
pos = 0
while not visited[pos]:
    visited[pos] = True
    pos = (pos + k) % n
    count += 1
print(count)
