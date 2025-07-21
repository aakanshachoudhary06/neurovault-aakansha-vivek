#!/usr/bin/env python3
"""
Performance test script to compare enhanced-chat vs fast-chat endpoints
"""

import asyncio
import aiohttp
import time
import json
from typing import List, Dict

# Test configuration
BASE_URL = "http://localhost:5001"
TEST_QUERIES = [
    "What day is your first as a software engineer at Google?",
    "Tell me about machine learning",
    "How are you today?",
    "What is artificial intelligence?",
    "Explain Python programming"
]

async def test_endpoint(session: aiohttp.ClientSession, endpoint: str, query: str, user_id: str = "local-user-1") -> Dict:
    """Test a single endpoint with a query and measure performance"""
    start_time = time.time()
    
    try:
        async with session.post(
            f"{BASE_URL}/{endpoint}",
            json={"query": query, "user_id": user_id},
            headers={"Content-Type": "application/json"}
        ) as response:
            end_time = time.time()
            duration = end_time - start_time
            
            if response.status == 200:
                data = await response.json()
                return {
                    "endpoint": endpoint,
                    "query": query,
                    "duration": duration,
                    "status": "success",
                    "answer_length": len(data.get("answer", "")),
                    "sources_count": len(data.get("sources", []))
                }
            else:
                return {
                    "endpoint": endpoint,
                    "query": query,
                    "duration": duration,
                    "status": "error",
                    "error": f"HTTP {response.status}"
                }
    except Exception as e:
        end_time = time.time()
        duration = end_time - start_time
        return {
            "endpoint": endpoint,
            "query": query,
            "duration": duration,
            "status": "error",
            "error": str(e)
        }

async def run_performance_test():
    """Run performance comparison between enhanced-chat and fast-chat"""
    print("🚀 Starting AI Chat Performance Test")
    print("=" * 60)
    
    async with aiohttp.ClientSession() as session:
        results = []
        
        # Test each query on both endpoints
        for query in TEST_QUERIES:
            print(f"\n📝 Testing query: '{query[:50]}...'")
            
            # Test enhanced-chat
            enhanced_result = await test_endpoint(session, "enhanced-chat", query)
            results.append(enhanced_result)
            print(f"   Enhanced Chat: {enhanced_result['duration']:.3f}s - {enhanced_result['status']}")
            
            # Small delay between tests
            await asyncio.sleep(0.5)
            
            # Test fast-chat
            fast_result = await test_endpoint(session, "fast-chat", query)
            results.append(fast_result)
            print(f"   Fast Chat:     {fast_result['duration']:.3f}s - {fast_result['status']}")
            
            # Calculate speedup
            if enhanced_result['status'] == 'success' and fast_result['status'] == 'success':
                speedup = enhanced_result['duration'] / fast_result['duration']
                print(f"   Speedup:       {speedup:.2f}x faster")
            
            await asyncio.sleep(1)  # Delay between queries
    
    # Analyze results
    print("\n" + "=" * 60)
    print("📊 PERFORMANCE ANALYSIS")
    print("=" * 60)
    
    enhanced_results = [r for r in results if r['endpoint'] == 'enhanced-chat' and r['status'] == 'success']
    fast_results = [r for r in results if r['endpoint'] == 'fast-chat' and r['status'] == 'success']
    
    if enhanced_results and fast_results:
        enhanced_avg = sum(r['duration'] for r in enhanced_results) / len(enhanced_results)
        fast_avg = sum(r['duration'] for r in fast_results) / len(fast_results)
        overall_speedup = enhanced_avg / fast_avg
        
        print(f"Enhanced Chat Average: {enhanced_avg:.3f}s")
        print(f"Fast Chat Average:     {fast_avg:.3f}s")
        print(f"Overall Speedup:       {overall_speedup:.2f}x faster")
        
        print(f"\nSuccess Rate:")
        print(f"Enhanced Chat: {len(enhanced_results)}/{len(TEST_QUERIES)} ({len(enhanced_results)/len(TEST_QUERIES)*100:.1f}%)")
        print(f"Fast Chat:     {len(fast_results)}/{len(TEST_QUERIES)} ({len(fast_results)/len(TEST_QUERIES)*100:.1f}%)")
    
    # Save detailed results
    with open("performance_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Detailed results saved to performance_results.json")
    print("✅ Performance test completed!")

if __name__ == "__main__":
    asyncio.run(run_performance_test())
