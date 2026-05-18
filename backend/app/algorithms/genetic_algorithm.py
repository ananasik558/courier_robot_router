import random
import numpy as np
from typing import List, Tuple
from deap import base, creator, tools, algorithms
from app.config import settings

class GeneticAlgorithmVRP:
    def __init__(self, distance_matrix: np.ndarray, time_matrix: np.ndarray, 
                 num_couriers: int, courier_capacities: List[float],
                 order_weights: List[float], time_windows: List[Tuple[int, int]]):
        """
        distance_matrix: матрица расстояний (м)
        time_matrix: матрица времени (сек)
        num_couriers: количество курьеров
        courier_capacities: грузоподъёмность каждого курьера
        order_weights: вес каждого заказа
        time_windows: временные окна (earliest, latest)
        """
        self.dist_matrix = distance_matrix
        self.time_matrix = time_matrix
        self.num_couriers = num_couriers
        self.capacities = courier_capacities
        self.weights = order_weights
        self.time_windows = time_windows
        self.num_orders = len(order_weights)
        
        self._setup_deap()
    
    def _setup_deap(self):
        creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
        creator.create("Individual", list, fitness=creator.FitnessMin)
        
        self.toolbox = base.Toolbox()
        self.toolbox.register("individual", self._create_individual)
        self.toolbox.register("population", tools.initRepeat, list, self.toolbox.individual)
        
        self.toolbox.register("evaluate", self._evaluate)
        self.toolbox.register("mate", self._crossover)
        self.toolbox.register("mutate", self._mutate)
        self.toolbox.register("select", tools.selTournament, tournsize=3)
    
    def _create_individual(self) -> List[int]:
        if self.num_orders == 0:
            return creator.Individual([])
        if self.num_orders == 1:
            return creator.Individual([1])  
        
        genes = list(range(1, self.num_orders + 1))
        random.shuffle(genes)
        return creator.Individual(genes)
    
    def _decode_route(self, individual: List[int]) -> List[List[int]]:
        routes = []
        current_route = [0] 
        current_load = 0
        courier_idx = 0
        
        for order_idx in individual:
            order_real_idx = order_idx - 1 
            order_weight = self.weights[order_real_idx]
            
            if current_load + order_weight > self.capacities[courier_idx % self.num_couriers]:
                current_route.append(0)  
                routes.append(current_route)
                current_route = [0]
                current_load = 0
                courier_idx += 1
            
            current_route.append(order_idx)
            current_load += order_weight
        
        if len(current_route) > 1:
            current_route.append(0) 
            routes.append(current_route)
        
        while len(routes) < self.num_couriers:
            routes.append([0, 0])
        
        return routes[:self.num_couriers]
    
    def _evaluate(self, individual: List[int]) -> Tuple[float]:
        routes = self._decode_route(individual)
        total_time = 0
        total_penalty = 0
        
        for route in routes:
            route_time = 0
            current_time = 0
            
            for i in range(len(route) - 1):
                from_idx = route[i]
                to_idx = route[i + 1]
                
                travel_time = self.time_matrix[from_idx][to_idx]
                route_time += travel_time
                current_time += travel_time
                
                if to_idx != 0: 
                    earliest, latest = self.time_windows[to_idx - 1]
                    if current_time > latest:
                        total_penalty += (current_time - latest) * 10 
                    elif current_time < earliest:
                        total_penalty += (earliest - current_time) * 0.1  
            
            total_time += route_time
        
        visited_orders = set()
        for route in routes:
            for point in route:
                if point != 0:
                    visited_orders.add(point)
        
        unvisited = self.num_orders - len(visited_orders)
        total_penalty += unvisited * 10000  
        
        return (total_time + total_penalty,)
    
    def _crossover(self, ind1: List[int], ind2: List[int]) -> Tuple[List[int], List[int]]:
        if len(ind1) < 2 or len(ind2) < 2:
            return ind1, ind2
        size = len(ind1)
        cxpoint1 = random.randint(0, size - 1)
        cxpoint2 = random.randint(cxpoint1, size - 1)
        
        child1 = ind1[:]
        child2 = ind2[:]
        
        for i in range(size):
            if i < cxpoint1 or i > cxpoint2:
                for gene in ind2:
                    if gene not in child1[:cxpoint1] + child1[cxpoint2+1:]:
                        child1[i] = gene
                        break
                for gene in ind1:
                    if gene not in child2[:cxpoint1] + child2[cxpoint2+1:]:
                        child2[i] = gene
                        break
        
        ind1[:] = child1
        ind2[:] = child2
        
        return ind1, ind2 
    
    def _mutate(self, individual: List[int]) -> Tuple[List[int]]:
        if len(individual) < 2:
            return (individual,)
        
        if random.random() < settings.GA_MUTATION_RATE:
            idx1, idx2 = random.sample(range(len(individual)), 2)
            individual[idx1], individual[idx2] = individual[idx2], individual[idx1]
        
        return (individual,)
    
    def optimize(self, verbose=True) -> Tuple[List[int], float]:
        pop = self.toolbox.population(n=settings.GA_POPULATION_SIZE)
        
        hof = tools.HallOfFame(1)
        stats = tools.Statistics(lambda ind: ind.fitness.values)
        stats.register("avg", np.mean)
        stats.register("min", np.min)
        
        pop, log = algorithms.eaSimple(
            pop, self.toolbox, 
            cxpb=settings.GA_CROSSOVER_RATE, 
            mutpb=settings.GA_MUTATION_RATE, 
            ngen=settings.GA_GENERATIONS, 
            stats=stats, 
            halloffame=hof,
            verbose=verbose
        )
        
        return hof[0], hof[0].fitness.values[0]