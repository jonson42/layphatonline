using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Temple.Server.Models;
using Temple.Server.Services;

namespace Temple.Server.WebSocket;

public class JsonRpcWebSocketHandler
{
    private readonly ConcurrentDictionary<string, System.Net.WebSockets.WebSocket> _sockets = new();
    private readonly RpcDispatcher _dispatcher;
    private readonly ITempleService _templeService;
    private readonly ILogger<JsonRpcWebSocketHandler> _logger;

    public JsonRpcWebSocketHandler(
        RpcDispatcher dispatcher,
        ITempleService templeService,
        ILogger<JsonRpcWebSocketHandler> logger)
    {
        _dispatcher = dispatcher;
        _templeService = templeService;
        _logger = logger;

        _templeService.SetBroadcaster(BroadcastNotification);
    }

    public async Task HandleWebSocketAsync(HttpContext context, System.Net.WebSockets.WebSocket socket)
    {
        string socketId = Guid.NewGuid().ToString("N");
        _sockets[socketId] = socket;

        _logger.LogInformation("[WebSocket] Client kết nối: {Id} (Tổng: {Count})", socketId, _sockets.Count);

        try
        {
            // Gửi initial temple.state ngay khi kết nối
            var initialState = _templeService.GetPublicState();
            await SendNotificationAsync(socket, "temple.state", initialState, CancellationToken.None);

            var buffer = new byte[1024 * 32];
            var ms = new MemoryStream();

            while (socket.State == WebSocketState.Open)
            {
                var result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                if (result.MessageType == WebSocketMessageType.Close)
                {
                    await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
                    break;
                }

                ms.Write(buffer, 0, result.Count);

                if (result.EndOfMessage)
                {
                    string rawJson = Encoding.UTF8.GetString(ms.ToArray());
                    ms.SetLength(0);

                    _ = ProcessIncomingMessageAsync(socket, rawJson);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "[WebSocket] Client {Id} đã đóng", socketId);
        }
        finally
        {
            _sockets.TryRemove(socketId, out _);
            _logger.LogInformation("[WebSocket] Client ngắt kết nối: {Id} (Còn: {Count})", socketId, _sockets.Count);
        }
    }

    private async Task ProcessIncomingMessageAsync(System.Net.WebSockets.WebSocket socket, string rawJson)
    {
        try
        {
            var req = JsonSerializer.Deserialize<JsonRpcRequest>(rawJson);
            if (req == null || string.IsNullOrWhiteSpace(req.Method)) return;

            try
            {
                var result = await _dispatcher.DispatchAsync(req.Method, req.Params);
                if (req.Id != null && socket.State == WebSocketState.Open)
                {
                    var resp = new JsonRpcResponse
                    {
                        JsonRpc = "2.0",
                        Id = req.Id,
                        Result = result
                    };
                    await SendJsonAsync(socket, resp, CancellationToken.None);
                }
            }
            catch (Exception ex)
            {
                if (req.Id != null && socket.State == WebSocketState.Open)
                {
                    var resp = new JsonRpcResponse
                    {
                        JsonRpc = "2.0",
                        Id = req.Id,
                        Error = JsonRpcError.ServerError(ex.Message)
                    };
                    await SendJsonAsync(socket, resp, CancellationToken.None);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[WebSocket] Lỗi xử lý tin nhắn JSON");
        }
    }

    public void BroadcastNotification(string method, object payload)
    {
        var notif = new JsonRpcNotification
        {
            JsonRpc = "2.0",
            Method = method,
            Params = payload
        };

        string json = JsonSerializer.Serialize(notif);
        byte[] bytes = Encoding.UTF8.GetBytes(json);

        foreach (var kvp in _sockets)
        {
            var socket = kvp.Value;
            if (socket.State == WebSocketState.Open)
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
                    }
                    catch { }
                });
            }
        }
    }

    private static Task SendNotificationAsync(System.Net.WebSockets.WebSocket socket, string method, object payload, CancellationToken ct)
    {
        var notif = new JsonRpcNotification
        {
            JsonRpc = "2.0",
            Method = method,
            Params = payload
        };
        return SendJsonAsync(socket, notif, ct);
    }

    private static async Task SendJsonAsync<T>(System.Net.WebSockets.WebSocket socket, T data, CancellationToken ct)
    {
        if (socket.State != WebSocketState.Open) return;
        string json = JsonSerializer.Serialize(data);
        byte[] bytes = Encoding.UTF8.GetBytes(json);
        await socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, ct);
    }
}

